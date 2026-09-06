"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/auth/roles";
import { validarStockDisponible, descontarStockVendido } from "@/lib/inventario";
import type { CuentaTipo } from "@/types/database.types";

export interface ItemRonda {
  productoId: string;
  cantidad: number;
}

/**
 * Envia toda la ronda (varios productos a la vez) en UN solo viaje al
 * servidor, despues de que la mesera arma el pedido localmente y lo
 * confirma. El stepper en si no toca la base de datos por cada toque
 * (eso resulto muy lento: cada toque disparaba una revalidacion completa
 * de la pagina) -- solo "Enviar a preparación" lo hace, una vez.
 */
export async function enviarRonda(
  cuentaId: string,
  subcuentaId: string,
  items: ItemRonda[]
) {
  const usuario = await requireRol("mesera");
  const itemsValidos = items.filter(
    (i) => Number.isFinite(i.cantidad) && i.cantidad > 0
  );
  if (!itemsValidos.length) return;

  await validarStockDisponible(
    itemsValidos.map((i) => ({ productoId: i.productoId, cantidad: i.cantidad }))
  );

  const supabase = await createClient();

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
    .filter((i) => precioPorId.has(i.productoId))
    .map((i) => ({
      subcuenta_id: subcuentaId,
      producto_id: i.productoId,
      cantidad: i.cantidad,
      precio_unitario: precioPorId.get(i.productoId)!,
      creado_por: usuario.id,
    }));

  if (!filas.length) return;

  const { data: itemsCreados, error } = await supabase
    .from("pedido_items")
    .insert(filas)
    .select("id, producto_id, cantidad");
  if (error) {
    throw new Error(`No se pudo enviar el pedido: ${error.message}`);
  }

  await descontarStockVendido(
    (itemsCreados ?? []).map((i) => ({
      productoId: i.producto_id,
      cantidad: i.cantidad,
      pedidoItemId: i.id,
    }))
  );

  revalidatePath(`/mesera/cuentas/${cuentaId}`);
  revalidatePath("/cocina");
  revalidatePath("/admin/inventario");
}

export async function marcarEntregado(cuentaId: string, itemId: string) {
  await requireRol("mesera");
  const supabase = await createClient();

  await supabase
    .from("pedido_items")
    .update({ estado: "entregado", entregado_at: new Date().toISOString() })
    .eq("id", itemId);

  revalidatePath(`/mesera/cuentas/${cuentaId}`);
}

export async function crearSubcuenta(cuentaId: string) {
  await requireRol("mesera");
  const supabase = await createClient();

  const { count } = await supabase
    .from("subcuentas")
    .select("id", { count: "exact", head: true })
    .eq("cuenta_id", cuentaId);

  const nombre = `Cuenta ${(count ?? 0) + 1}`;

  const { data: subcuenta, error } = await supabase
    .from("subcuentas")
    .insert({ cuenta_id: cuentaId, nombre_cliente: nombre })
    .select("id, nombre_cliente")
    .single();

  if (error || !subcuenta) {
    throw new Error(`No se pudo crear la sub-cuenta: ${error?.message ?? ""}`);
  }

  revalidatePath(`/mesera/cuentas/${cuentaId}`);
  return subcuenta;
}

/** Mueve la cuenta a otra mesa/silla libre (mismo tipo mesa->mesa o silla->silla). */
export async function moverCuenta(
  cuentaId: string,
  tipo: CuentaTipo,
  nuevaUbicacionId: string
) {
  await requireRol("mesera");
  const supabase = await createClient();

  const actualizacion =
    tipo === "mesa"
      ? { mesa_id: nuevaUbicacionId, silla_barra_id: null }
      : { silla_barra_id: nuevaUbicacionId, mesa_id: null };

  const { error } = await supabase
    .from("cuenta_ubicaciones")
    .update(actualizacion)
    .eq("cuenta_id", cuentaId);

  if (error) {
    throw new Error(`No se pudo mover la cuenta: ${error.message}`);
  }

  revalidatePath(`/mesera/cuentas/${cuentaId}`);
  revalidatePath("/mesera");
}
