"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/auth/roles";

export async function crearMesa(formData: FormData) {
  const usuario = await requireRol("admin");
  const numero = String(formData.get("numero") ?? "").trim();
  if (!numero || !usuario.sedeId) return;

  const supabase = await createClient();
  await supabase.from("mesas").insert({
    sede_id: usuario.sedeId,
    numero,
  });

  revalidatePath("/admin/mesas");
}

export async function toggleMesaActiva(mesaId: string, activa: boolean) {
  await requireRol("admin");
  const supabase = await createClient();
  await supabase.from("mesas").update({ activa }).eq("id", mesaId);
  revalidatePath("/admin/mesas");
}
