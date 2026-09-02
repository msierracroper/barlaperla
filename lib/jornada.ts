import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { JornadaRow } from "@/types/database.types";

/**
 * Resuelve la jornada operativa activa de la sede (creandola si no existe)
 * via la funcion SQL jornada_activa(). Centraliza aqui la regla de negocio
 * del "dia de negocio" (~17:00 a ~01:00 del dia siguiente, hora Bogota) para
 * no duplicarla en cada pantalla que registre ventas/gastos/cierres.
 */
export async function obtenerJornadaActiva(
  sedeId: string
): Promise<JornadaRow> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("jornada_activa", {
    p_sede_id: sedeId,
  });

  if (error || !data) {
    throw new Error(
      `No se pudo resolver la jornada activa: ${error?.message ?? "sin datos"}`
    );
  }

  return data;
}
