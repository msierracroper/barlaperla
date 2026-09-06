"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/auth/roles";
import { obtenerJornadaActiva } from "@/lib/jornada";

export async function registrarAbono(
  fiadoId: string,
  monto: number,
  metodo: "efectivo" | "transferencia"
) {
  const usuario = await requireRol("cajero");

  if (!Number.isFinite(monto) || monto <= 0) {
    throw new Error("El monto del abono no es válido.");
  }
  if (!usuario.sedeId) {
    throw new Error("Tu usuario no tiene una sede asignada.");
  }

  const supabase = await createClient();

  const { data: fiado, error: errorFiado } = await supabase
    .from("fiados")
    .select("monto_total, monto_pagado, estado")
    .eq("id", fiadoId)
    .single();

  if (errorFiado || !fiado) {
    throw new Error("No se pudo encontrar el fiado.");
  }

  const saldo = fiado.monto_total - fiado.monto_pagado;
  if (monto > saldo + 0.01) {
    throw new Error(
      `El abono ($${monto.toLocaleString("es-CO")}) no puede ser mayor al saldo pendiente ($${saldo.toLocaleString("es-CO")}).`
    );
  }

  const jornada = await obtenerJornadaActiva(usuario.sedeId);

  const { error: errorAbono } = await supabase.from("fiado_abonos").insert({
    fiado_id: fiadoId,
    monto,
    metodo,
    jornada_id: jornada.id,
    registrado_por: usuario.id,
  });
  if (errorAbono) {
    throw new Error(`No se pudo registrar el abono: ${errorAbono.message}`);
  }

  const nuevoPagado = fiado.monto_pagado + monto;
  const { error: errorUpdate } = await supabase
    .from("fiados")
    .update({
      monto_pagado: nuevoPagado,
      estado: nuevoPagado >= fiado.monto_total ? "pagado" : "abonado_parcial",
    })
    .eq("id", fiadoId);
  if (errorUpdate) {
    throw new Error(`No se pudo actualizar el fiado: ${errorUpdate.message}`);
  }

  revalidatePath("/caja/fiados");
  revalidatePath("/caja");
}
