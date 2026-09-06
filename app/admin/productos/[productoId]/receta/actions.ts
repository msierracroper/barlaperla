"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/auth/roles";

export async function agregarIngrediente(
  productoCoctelId: string,
  productoIngredienteId: string,
  cantidadMl: number
) {
  await requireRol("admin");

  if (!productoIngredienteId) {
    throw new Error("Selecciona un ingrediente.");
  }
  if (!Number.isFinite(cantidadMl) || cantidadMl <= 0) {
    throw new Error("La cantidad (ml) no es válida.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("recetas_coctel").insert({
    producto_coctel_id: productoCoctelId,
    producto_ingrediente_id: productoIngredienteId,
    cantidad_ml: cantidadMl,
  });

  if (error) {
    throw new Error(`No se pudo agregar el ingrediente: ${error.message}`);
  }

  revalidatePath(`/admin/productos/${productoCoctelId}/receta`);
}

export async function quitarIngrediente(recetaId: string, productoCoctelId: string) {
  await requireRol("admin");

  const supabase = await createClient();
  const { error } = await supabase
    .from("recetas_coctel")
    .delete()
    .eq("id", recetaId);

  if (error) {
    throw new Error(`No se pudo quitar el ingrediente: ${error.message}`);
  }

  revalidatePath(`/admin/productos/${productoCoctelId}/receta`);
}
