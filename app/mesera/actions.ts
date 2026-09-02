"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/auth/roles";
import { obtenerJornadaActiva } from "@/lib/jornada";
import type { CuentaTipo } from "@/types/database.types";

async function abrirCuenta(
  tipo: CuentaTipo,
  ubicacion: { mesa_id?: string; silla_barra_id?: string }
) {
  const usuario = await requireRol("mesera");
  if (!usuario.sedeId) {
    throw new Error("El usuario no tiene una sede asignada.");
  }

  const jornada = await obtenerJornadaActiva(usuario.sedeId);
  const supabase = await createClient();

  const { data: cuenta, error: errorCuenta } = await supabase
    .from("cuentas")
    .insert({
      sede_id: usuario.sedeId,
      jornada_id: jornada.id,
      tipo,
      creado_por: usuario.id,
    })
    .select("id")
    .single();

  if (errorCuenta || !cuenta) {
    throw new Error("No se pudo abrir la cuenta.");
  }

  const { error: errorUbicacion } = await supabase
    .from("cuenta_ubicaciones")
    .insert({ cuenta_id: cuenta.id, ...ubicacion });

  if (errorUbicacion) {
    throw new Error(
      `No se pudo asignar la ubicación de la cuenta: ${errorUbicacion.message}`
    );
  }

  const { error: errorSubcuenta } = await supabase
    .from("subcuentas")
    .insert({ cuenta_id: cuenta.id });

  if (errorSubcuenta) {
    throw new Error(
      `No se pudo crear la sub-cuenta: ${errorSubcuenta.message}`
    );
  }

  revalidatePath("/cocina");
  redirect(`/mesera/cuentas/${cuenta.id}`);
}

export async function abrirCuentaMesa(mesaId: string) {
  await abrirCuenta("mesa", { mesa_id: mesaId });
}

export async function abrirCuentaSilla(sillaId: string) {
  await abrirCuenta("barra", { silla_barra_id: sillaId });
}
