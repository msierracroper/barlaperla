"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/auth/roles";

export async function crearBarra(formData: FormData) {
  const usuario = await requireRol("admin");
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre || !usuario.sedeId) return;

  const supabase = await createClient();
  await supabase.from("barras").insert({ sede_id: usuario.sedeId, nombre });

  revalidatePath("/admin/barras");
}

export async function toggleBarraActiva(barraId: string, activa: boolean) {
  await requireRol("admin");
  const supabase = await createClient();
  await supabase.from("barras").update({ activa }).eq("id", barraId);
  revalidatePath("/admin/barras");
}

export async function actualizarBarra(barraId: string, formData: FormData) {
  await requireRol("admin");
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) return;

  const supabase = await createClient();
  await supabase.from("barras").update({ nombre }).eq("id", barraId);
  revalidatePath("/admin/barras");
  revalidatePath(`/admin/barras/${barraId}`);
}

export async function actualizarSilla(
  barraId: string,
  sillaId: string,
  formData: FormData
) {
  await requireRol("admin");
  const numero = String(formData.get("numero") ?? "").trim();
  if (!numero) return;

  const supabase = await createClient();
  await supabase.from("sillas_barra").update({ numero }).eq("id", sillaId);
  revalidatePath(`/admin/barras/${barraId}`);
}

export async function crearSilla(barraId: string, formData: FormData) {
  await requireRol("admin");
  const numero = String(formData.get("numero") ?? "").trim();
  if (!numero) return;

  const supabase = await createClient();
  await supabase.from("sillas_barra").insert({ barra_id: barraId, numero });

  revalidatePath(`/admin/barras/${barraId}`);
}

export async function toggleSillaActiva(
  barraId: string,
  sillaId: string,
  activa: boolean
) {
  await requireRol("admin");
  const supabase = await createClient();
  await supabase.from("sillas_barra").update({ activa }).eq("id", sillaId);
  revalidatePath(`/admin/barras/${barraId}`);
}
