"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/auth/roles";
import { obtenerJornadaActiva } from "@/lib/jornada";
import { reponerStockAnulado } from "@/lib/inventario";
import type { MetodoPago } from "@/types/database.types";

export interface DatosPago {
  metodo: MetodoPago;
  montoEfectivo: number;
  montoTransferencia: number;
  montoTotal: number;
  /** Solo cuando metodo === "fiado" (v1: el fiado siempre es el 100% del total, sin combinar con efectivo/transferencia). */
  fiado?: {
    clienteFiadoId?: string;
    clienteNuevo?: { nombre: string; telefono?: string };
  };
}

export async function registrarPago(
  cuentaId: string,
  subcuentaId: string,
  pago: DatosPago
): Promise<{ cuentaCerrada: boolean }> {
  const usuario = await requireRol("cajero");
  const { metodo, montoTotal, montoEfectivo, montoTransferencia } = pago;

  if (!Number.isFinite(montoTotal) || montoTotal <= 0) {
    throw new Error("El total a cobrar no es válido.");
  }
  if (
    metodo !== "fiado" &&
    Math.round(montoEfectivo + montoTransferencia) !== Math.round(montoTotal)
  ) {
    throw new Error(
      "La suma de efectivo y transferencia debe ser igual al total."
    );
  }

  const supabase = await createClient();

  // Si la cuenta quedo abierta de una jornada anterior (mesa/silla que
  // nunca se cerro antes del corte del dia de negocio), el cobro de hoy
  // debe contar para la jornada de HOY -- si no, el efectivo recibido hoy
  // no aparece en el resumen/arqueo de caja de hoy.
  const { data: cuenta } = await supabase
    .from("cuentas")
    .select("sede_id, jornada_id")
    .eq("id", cuentaId)
    .single();

  if (cuenta) {
    const jornadaActual = await obtenerJornadaActiva(cuenta.sede_id);
    if (jornadaActual.id !== cuenta.jornada_id) {
      await supabase
        .from("cuentas")
        .update({ jornada_id: jornadaActual.id })
        .eq("id", cuentaId);
    }
  }

  // Fiado: resolver el cliente (existente o crearlo de una) ANTES de
  // insertar el pago, porque el registro en `fiados` necesita su id.
  let clienteFiadoId: string | undefined;
  if (metodo === "fiado") {
    clienteFiadoId = pago.fiado?.clienteFiadoId;
    const nombreNuevo = pago.fiado?.clienteNuevo?.nombre.trim();

    if (!clienteFiadoId && nombreNuevo) {
      if (!cuenta) {
        throw new Error("No se pudo resolver la sede de la cuenta.");
      }
      const { data: clienteCreado, error: errorCliente } = await supabase
        .from("clientes_fiado")
        .insert({
          sede_id: cuenta.sede_id,
          nombre: nombreNuevo,
          telefono: pago.fiado?.clienteNuevo?.telefono?.trim() || null,
        })
        .select("id")
        .single();
      if (errorCliente || !clienteCreado) {
        throw new Error(
          `No se pudo crear el cliente de fiado: ${errorCliente?.message ?? "sin datos"}`
        );
      }
      clienteFiadoId = clienteCreado.id;
    }

    if (!clienteFiadoId) {
      throw new Error("Selecciona o crea un cliente para el fiado.");
    }
  }

  const { data: pagoCreado, error: errorPago } = await supabase
    .from("pagos")
    .insert({
      subcuenta_id: subcuentaId,
      metodo,
      monto_efectivo: montoEfectivo,
      monto_transferencia: montoTransferencia,
      monto_fiado: metodo === "fiado" ? montoTotal : 0,
      monto_total: montoTotal,
      registrado_por: usuario.id,
    })
    .select("id")
    .single();
  if (errorPago || !pagoCreado) {
    throw new Error(`No se pudo registrar el pago: ${errorPago?.message ?? "sin datos"}`);
  }

  if (metodo === "fiado" && clienteFiadoId) {
    const { error: errorFiado } = await supabase.from("fiados").insert({
      pago_id: pagoCreado.id,
      cliente_fiado_id: clienteFiadoId,
      monto_total: montoTotal,
      autorizado_por: usuario.id,
    });
    if (errorFiado) {
      throw new Error(`No se pudo registrar el fiado: ${errorFiado.message}`);
    }
  }

  const { error: errorSub } = await supabase
    .from("subcuentas")
    .update({ estado: "cerrada" })
    .eq("id", subcuentaId);
  if (errorSub) {
    throw new Error(`No se pudo cerrar la sub-cuenta: ${errorSub.message}`);
  }

  // La cuenta solo se cierra cuando TODAS sus sub-cuentas ya estan pagadas
  // (una cuenta puede tener varias personas pagando por separado).
  const { data: subcuentasRestantes } = await supabase
    .from("subcuentas")
    .select("id")
    .eq("cuenta_id", cuentaId)
    .neq("estado", "cerrada");

  const cuentaCerrada = !subcuentasRestantes || subcuentasRestantes.length === 0;

  if (cuentaCerrada) {
    const { error: errorCuenta } = await supabase
      .from("cuentas")
      .update({ estado: "cerrada", cerrada_at: new Date().toISOString() })
      .eq("id", cuentaId);
    if (errorCuenta) {
      throw new Error(`No se pudo cerrar la cuenta: ${errorCuenta.message}`);
    }
  }

  revalidatePath("/caja");
  revalidatePath("/caja/fiados");
  revalidatePath("/mesera");
  revalidatePath("/cocina");

  return { cuentaCerrada };
}

/**
 * Anular un item que resulto ser un error (producto/cantidad equivocada,
 * pedido que no se sirvio, etc.). Por reglas de negocio del alcance, solo
 * cajero/admin pueden anular -- la mesera no. El item regresa
 * automaticamente al inventario (productos 'simple' por ahora).
 */
export async function anularItem(
  cuentaId: string,
  itemId: string,
  motivo: string
) {
  const usuario = await requireRol("cajero");
  const motivoLimpio = motivo.trim();
  if (!motivoLimpio) {
    throw new Error("Escribe un motivo para anular el item.");
  }

  const supabase = await createClient();

  const { data: item } = await supabase
    .from("pedido_items")
    .select("producto_id, cantidad, anulado")
    .eq("id", itemId)
    .single();
  if (!item) {
    throw new Error("No se encontró el item.");
  }
  if (item.anulado) {
    throw new Error("Este item ya estaba anulado.");
  }

  const { error } = await supabase
    .from("pedido_items")
    .update({
      anulado: true,
      estado: "anulado",
      motivo_anulacion: motivoLimpio,
      anulado_por: usuario.id,
      anulado_at: new Date().toISOString(),
    })
    .eq("id", itemId);

  if (error) {
    throw new Error(`No se pudo anular el item: ${error.message}`);
  }

  await reponerStockAnulado([
    { productoId: item.producto_id, cantidad: item.cantidad, pedidoItemId: itemId },
  ]);

  revalidatePath(`/caja/cuentas/${cuentaId}`);
  revalidatePath("/caja");
  revalidatePath("/mesera");
  revalidatePath("/cocina");
  revalidatePath("/admin/inventario");
}

/**
 * Cancela la cuenta completa sin cobrar nada (ej. el cliente se va sin
 * consumir lo que ya se envio a preparacion). Anula todos los items no
 * anulados, cierra sus sub-cuentas y marca la cuenta como "anulada" (no
 * "cerrada", para no mezclarla con cuentas que si se pagaron en reportes
 * futuros). A diferencia de anular UN item, esto es exclusivo de admin.
 */
export async function cancelarCuenta(cuentaId: string, motivo: string) {
  const usuario = await requireRol("admin");
  const motivoLimpio = motivo.trim();
  if (!motivoLimpio) {
    throw new Error("Escribe un motivo para cancelar la cuenta.");
  }

  const supabase = await createClient();

  const { data: subcuentas } = await supabase
    .from("subcuentas")
    .select("id")
    .eq("cuenta_id", cuentaId);

  const subcuentaIds = (subcuentas ?? []).map((s) => s.id);

  if (subcuentaIds.length) {
    const { data: itemsAAnular } = await supabase
      .from("pedido_items")
      .select("id, producto_id, cantidad")
      .in("subcuenta_id", subcuentaIds)
      .eq("anulado", false);

    const { error: errorItems } = await supabase
      .from("pedido_items")
      .update({
        anulado: true,
        estado: "anulado",
        motivo_anulacion: motivoLimpio,
        anulado_por: usuario.id,
        anulado_at: new Date().toISOString(),
      })
      .in("subcuenta_id", subcuentaIds)
      .eq("anulado", false);

    if (errorItems) {
      throw new Error(`No se pudieron anular los items: ${errorItems.message}`);
    }

    await reponerStockAnulado(
      (itemsAAnular ?? []).map((i) => ({
        productoId: i.producto_id,
        cantidad: i.cantidad,
        pedidoItemId: i.id,
      }))
    );

    await supabase
      .from("subcuentas")
      .update({ estado: "cerrada" })
      .in("id", subcuentaIds);
  }

  const { error: errorCuenta } = await supabase
    .from("cuentas")
    .update({ estado: "anulada", cerrada_at: new Date().toISOString() })
    .eq("id", cuentaId);

  if (errorCuenta) {
    throw new Error(`No se pudo cancelar la cuenta: ${errorCuenta.message}`);
  }

  revalidatePath("/caja");
  revalidatePath(`/caja/cuentas/${cuentaId}`);
  revalidatePath("/mesera");
  revalidatePath("/cocina");
  revalidatePath("/admin/inventario");
}
