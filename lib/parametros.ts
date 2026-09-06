import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function obtenerParametro(
  sedeId: string,
  clave: string
): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("parametros_sistema")
    .select("valor")
    .eq("sede_id", sedeId)
    .eq("clave", clave)
    .maybeSingle();
  return data?.valor ?? null;
}

const TAMANO_SHOT_ML_DEFECTO = 45;

/** Tamaño del shot (ml) configurado por el admin, o 45ml por defecto si no se ha configurado. */
export async function obtenerTamanoShotMl(sedeId: string): Promise<number> {
  const valor = await obtenerParametro(sedeId, "tamano_shot_ml");
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0 ? numero : TAMANO_SHOT_ML_DEFECTO;
}
