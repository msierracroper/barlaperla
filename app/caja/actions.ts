"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/auth/roles";
import { calcularResumenCaja } from "@/lib/caja";

export async function actualizarBaseCaja(jornadaId: string, formData: FormData) {
  await requireRol("cajero");
  const base = Number(formData.get("base_caja_inicial"));
  if (!Number.isFinite(base) || base < 0) return;

  const supabase = await createClient();
  await supabase
    .from("jornadas")
    .update({ base_caja_inicial: base })
    .eq("id", jornadaId);

  revalidatePath("/caja");
}

export async function cerrarJornada(jornadaId: string, formData: FormData) {
  const usuario = await requireRol("cajero");
  const efectivoContado = Number(formData.get("efectivo_contado"));
  if (!Number.isFinite(efectivoContado) || efectivoContado < 0) return;

  const supabase = await createClient();

  const { data: jornada } = await supabase
    .from("jornadas")
    .select("base_caja_inicial")
    .eq("id", jornadaId)
    .single();

  if (!jornada) return;

  const resumen = await calcularResumenCaja(jornadaId);
  const efectivoEsperado =
    jornada.base_caja_inicial + resumen.efectivo - resumen.gastos;

  await supabase
    .from("jornadas")
    .update({
      estado: "cerrada",
      efectivo_contado: efectivoContado,
      diferencia_caja: efectivoContado - efectivoEsperado,
      usuario_cierre_id: usuario.id,
      cerrada_at: new Date().toISOString(),
    })
    .eq("id", jornadaId);

  revalidatePath("/caja");
}
