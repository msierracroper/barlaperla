"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/auth/roles";
import type { ControlInventarioTipo } from "@/types/database.types";

const TIPOS_CONTROL: ControlInventarioTipo[] = [
  "simple",
  "licor_multiuso",
  "receta",
];

export async function crearProducto(formData: FormData) {
  const usuario = await requireRol("admin");
  if (!usuario.sedeId) return;

  const nombre = String(formData.get("nombre") ?? "").trim();
  const precioVenta = Number(formData.get("precio_venta"));
  const categoriaId = String(formData.get("categoria_id") ?? "") || null;
  const controlInventario = String(
    formData.get("control_inventario") ?? "simple"
  ) as ControlInventarioTipo;
  const stockMinimoRaw = String(formData.get("stock_minimo") ?? "").trim();
  const stockMinimo = stockMinimoRaw ? Number(stockMinimoRaw) : 0;

  if (!nombre || !Number.isFinite(precioVenta) || precioVenta < 0) return;
  if (!TIPOS_CONTROL.includes(controlInventario)) return;

  const supabase = await createClient();

  const { data: producto, error } = await supabase
    .from("productos")
    .insert({
      sede_id: usuario.sedeId,
      categoria_id: categoriaId,
      nombre,
      precio_venta: precioVenta,
      control_inventario: controlInventario,
      stock_minimo: stockMinimo,
    })
    .select("id")
    .single();

  if (!error && producto && controlInventario === "simple") {
    await supabase
      .from("stock_simple")
      .insert({ producto_id: producto.id, cantidad_actual: 0 });
  }

  revalidatePath("/admin/productos");
}

export async function toggleProductoActivo(
  productoId: string,
  activo: boolean
) {
  await requireRol("admin");
  const supabase = await createClient();
  await supabase.from("productos").update({ activo }).eq("id", productoId);
  revalidatePath("/admin/productos");
}
