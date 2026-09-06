"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/auth/roles";
import { obtenerJornadaActiva } from "@/lib/jornada";
import { validarStockDisponible, descontarStockVendido } from "@/lib/inventario";
import type { CuentaTipo } from "@/types/database.types";

export interface ItemPedidoNuevo {
  productoId: string;
  cantidad: number;
  subcuenta: string;
}

export interface DatosPedidoNuevo {
  tipo: CuentaTipo;
  ubicacionId: string;
  subcuentas: string[];
  items: ItemPedidoNuevo[];
}

/**
 * Crea la cuenta (o reutiliza una abierta en esa misma ubicacion, por si
 * hubo doble-tap) junto con sus sub-cuentas y todos los pedido_items, en
 * un solo paso -- la cuenta NO existe en la base de datos hasta que la
 * mesera confirma el pedido completo. Esto evita que una mesa quede
 * "ocupada" solo por haberla tocado sin llegar a pedir nada.
 */
export async function crearCuentaConPedido(
  datos: DatosPedidoNuevo
): Promise<string> {
  const usuario = await requireRol("mesera");
  if (!usuario.sedeId) {
    throw new Error("El usuario no tiene una sede asignada.");
  }

  const itemsValidos = datos.items.filter(
    (i) => Number.isFinite(i.cantidad) && i.cantidad > 0
  );
  if (!itemsValidos.length) {
    throw new Error("El pedido está vacío.");
  }

  await validarStockDisponible(
    itemsValidos.map((i) => ({ productoId: i.productoId, cantidad: i.cantidad }))
  );

  const supabase = await createClient();
  const columnaUbicacion =
    datos.tipo === "mesa" ? "mesa_id" : "silla_barra_id";

  const { data: ubicacionesExistentes } = await supabase
    .from("cuenta_ubicaciones")
    .select("cuenta_id")
    .eq(columnaUbicacion, datos.ubicacionId);

  const idsExistentes = (ubicacionesExistentes ?? []).map((u) => u.cuenta_id);

  let cuentaAbierta: { id: string } | null = null;
  if (idsExistentes.length) {
    const { data } = await supabase
      .from("cuentas")
      .select("id")
      .in("id", idsExistentes)
      .eq("estado", "abierta")
      .maybeSingle();
    cuentaAbierta = data;
  }

  let cuentaId: string;
  const subcuentaIdPorLabel = new Map<string, string>();

  if (cuentaAbierta) {
    cuentaId = cuentaAbierta.id;
    const { data: existentes } = await supabase
      .from("subcuentas")
      .select("id, nombre_cliente")
      .eq("cuenta_id", cuentaId);
    for (const s of existentes ?? []) {
      subcuentaIdPorLabel.set(s.nombre_cliente, s.id);
    }
  } else {
    const jornada = await obtenerJornadaActiva(usuario.sedeId);

    const { data: cuenta, error: errorCuenta } = await supabase
      .from("cuentas")
      .insert({
        sede_id: usuario.sedeId,
        jornada_id: jornada.id,
        tipo: datos.tipo,
        creado_por: usuario.id,
      })
      .select("id")
      .single();

    if (errorCuenta || !cuenta) {
      throw new Error("No se pudo crear la cuenta.");
    }
    cuentaId = cuenta.id;

    const { error: errorUbicacion } =
      datos.tipo === "mesa"
        ? await supabase
            .from("cuenta_ubicaciones")
            .insert({ cuenta_id: cuentaId, mesa_id: datos.ubicacionId })
        : await supabase
            .from("cuenta_ubicaciones")
            .insert({ cuenta_id: cuentaId, silla_barra_id: datos.ubicacionId });

    if (errorUbicacion) {
      throw new Error(
        `No se pudo asignar la ubicación de la cuenta: ${errorUbicacion.message}`
      );
    }
  }

  for (const label of datos.subcuentas) {
    if (subcuentaIdPorLabel.has(label)) continue;
    const { data: nueva, error } = await supabase
      .from("subcuentas")
      .insert({ cuenta_id: cuentaId, nombre_cliente: label })
      .select("id")
      .single();
    if (error || !nueva) {
      throw new Error(`No se pudo crear ${label}.`);
    }
    subcuentaIdPorLabel.set(label, nueva.id);
  }

  const { data: productos } = await supabase
    .from("productos")
    .select("id, precio_venta")
    .in(
      "id",
      itemsValidos.map((i) => i.productoId)
    );
  const precioPorId = new Map(
    (productos ?? []).map((p) => [p.id, p.precio_venta])
  );

  const filas = itemsValidos
    .filter(
      (i) =>
        precioPorId.has(i.productoId) && subcuentaIdPorLabel.has(i.subcuenta)
    )
    .map((i) => ({
      subcuenta_id: subcuentaIdPorLabel.get(i.subcuenta)!,
      producto_id: i.productoId,
      cantidad: i.cantidad,
      precio_unitario: precioPorId.get(i.productoId)!,
      creado_por: usuario.id,
    }));

  if (!filas.length) {
    throw new Error("No se pudo preparar el pedido.");
  }

  const { data: itemsCreados, error: errorItems } = await supabase
    .from("pedido_items")
    .insert(filas)
    .select("id, producto_id, cantidad");

  if (errorItems) {
    throw new Error(`No se pudo enviar el pedido: ${errorItems.message}`);
  }

  await descontarStockVendido(
    (itemsCreados ?? []).map((i) => ({
      productoId: i.producto_id,
      cantidad: i.cantidad,
      pedidoItemId: i.id,
    }))
  );

  revalidatePath("/mesera");
  revalidatePath("/cocina");
  revalidatePath("/admin/inventario");

  return cuentaId;
}
