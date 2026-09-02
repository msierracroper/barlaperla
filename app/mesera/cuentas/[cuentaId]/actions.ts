"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/auth/roles";

export interface ItemRonda {
  productoId: string;
  cantidad: number;
}

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

  const { error } = await supabase.from("pedido_items").insert(filas);
  if (error) {
    throw new Error(`No se pudo enviar el pedido: ${error.message}`);
  }

  revalidatePath(`/mesera/cuentas/${cuentaId}`);
  revalidatePath("/cocina");
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
