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

export interface DatosProducto {
  nombre: string;
  categoriaId: string | null;
  precioVenta: number;
  controlInventario: ControlInventarioTipo;
  stockMinimo: number;
  activo: boolean;
}

function validar(datos: DatosProducto) {
  if (!datos.nombre.trim()) throw new Error("El nombre es obligatorio.");
  if (!Number.isFinite(datos.precioVenta) || datos.precioVenta < 0) {
    throw new Error("El precio no es válido.");
  }
  if (!TIPOS_CONTROL.includes(datos.controlInventario)) {
    throw new Error("Tipo de control inválido.");
  }
}

export async function crearProducto(datos: DatosProducto) {
  const usuario = await requireRol("admin");
  if (!usuario.sedeId) throw new Error("El admin no tiene sede asignada.");
  validar(datos);

  const supabase = await createClient();

  const { data: producto, error } = await supabase
    .from("productos")
    .insert({
      sede_id: usuario.sedeId,
      categoria_id: datos.categoriaId,
      nombre: datos.nombre.trim(),
      precio_venta: datos.precioVenta,
      control_inventario: datos.controlInventario,
      stock_minimo: datos.stockMinimo,
      activo: datos.activo,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`No se pudo crear el producto: ${error.message}`);
  }

  if (producto && datos.controlInventario === "simple") {
    await supabase
      .from("stock_simple")
      .insert({ producto_id: producto.id, cantidad_actual: 0 });
  }

  revalidatePath("/admin/productos");
}

export async function actualizarProducto(
  productoId: string,
  datos: DatosProducto
) {
  await requireRol("admin");
  validar(datos);

  const supabase = await createClient();

  const { error } = await supabase
    .from("productos")
    .update({
      nombre: datos.nombre.trim(),
      categoria_id: datos.categoriaId,
      precio_venta: datos.precioVenta,
      control_inventario: datos.controlInventario,
      stock_minimo: datos.stockMinimo,
      activo: datos.activo,
    })
    .eq("id", productoId);

  if (error) {
    throw new Error(`No se pudo actualizar el producto: ${error.message}`);
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
