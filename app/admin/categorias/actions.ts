"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/auth/roles";

export interface DatosCategoria {
  nombre: string;
  activa: boolean;
}

function validar(datos: DatosCategoria) {
  if (!datos.nombre.trim()) throw new Error("El nombre es obligatorio.");
}

export async function crearCategoria(datos: DatosCategoria) {
  const usuario = await requireRol("admin");
  if (!usuario.sedeId) throw new Error("El admin no tiene sede asignada.");
  validar(datos);

  const supabase = await createClient();
  const { error } = await supabase.from("categorias_producto").insert({
    sede_id: usuario.sedeId,
    nombre: datos.nombre.trim(),
    activa: datos.activa,
  });

  if (error) {
    throw new Error(`No se pudo crear la categoría: ${error.message}`);
  }

  revalidatePath("/admin/categorias");
}

export async function actualizarCategoria(
  categoriaId: string,
  datos: DatosCategoria
) {
  await requireRol("admin");
  validar(datos);

  const supabase = await createClient();
  const { error } = await supabase
    .from("categorias_producto")
    .update({ nombre: datos.nombre.trim(), activa: datos.activa })
    .eq("id", categoriaId);

  if (error) {
    throw new Error(`No se pudo actualizar la categoría: ${error.message}`);
  }

  revalidatePath("/admin/categorias");
  revalidatePath("/admin/productos");
}

export async function toggleCategoriaActiva(
  categoriaId: string,
  activa: boolean
) {
  await requireRol("admin");
  const supabase = await createClient();
  await supabase
    .from("categorias_producto")
    .update({ activa })
    .eq("id", categoriaId);
  revalidatePath("/admin/categorias");
}
