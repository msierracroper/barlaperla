"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/auth/roles";

export async function registrarGasto(
  jornadaId: string,
  categoriaId: string | null,
  monto: number,
  descripcion: string
) {
  const usuario = await requireRol("cajero");
  if (!usuario.sedeId) {
    throw new Error("Tu usuario no tiene una sede asignada.");
  }
  if (!Number.isFinite(monto) || monto <= 0) {
    throw new Error("El monto no es válido.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("gastos").insert({
    sede_id: usuario.sedeId,
    jornada_id: jornadaId,
    categoria_id: categoriaId,
    monto,
    descripcion: descripcion.trim() || null,
    registrado_por: usuario.id,
  });

  if (error) {
    throw new Error(`No se pudo registrar el gasto: ${error.message}`);
  }

  revalidatePath("/caja/gastos");
  revalidatePath("/caja");
}

export async function crearCategoriaGasto(formData: FormData) {
  const usuario = await requireRol("admin");
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre || !usuario.sedeId) return;

  const supabase = await createClient();
  await supabase
    .from("gastos_categorias")
    .insert({ sede_id: usuario.sedeId, nombre });

  revalidatePath("/caja/gastos");
}

export async function toggleCategoriaGastoActiva(id: string, activa: boolean) {
  await requireRol("admin");
  const supabase = await createClient();
  await supabase.from("gastos_categorias").update({ activa }).eq("id", id);
  revalidatePath("/caja/gastos");
}
