"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/auth/roles";

export async function crearCategoria(formData: FormData) {
  const usuario = await requireRol("admin");
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre || !usuario.sedeId) return;

  const supabase = await createClient();
  await supabase
    .from("categorias_producto")
    .insert({ sede_id: usuario.sedeId, nombre });

  revalidatePath("/admin/categorias");
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
