import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Resuelve la etiqueta visible ("Mesa 3", "Barra 1 · Silla 4") de un grupo
 * de cuentas a partir de su cuenta_ubicaciones. Centralizado aca porque lo
 * necesitan mesera, preparador y cajero por igual.
 */
export async function etiquetasPorCuenta(
  cuentaIds: string[]
): Promise<Map<string, string>> {
  const resultado = new Map<string, string>();
  if (!cuentaIds.length) return resultado;

  const supabase = await createClient();

  const { data: ubicaciones } = await supabase
    .from("cuenta_ubicaciones")
    .select("cuenta_id, mesa_id, silla_barra_id")
    .in("cuenta_id", cuentaIds);

  const mesaIds = (ubicaciones ?? [])
    .map((u) => u.mesa_id)
    .filter((id): id is string => Boolean(id));
  const sillaIds = (ubicaciones ?? [])
    .map((u) => u.silla_barra_id)
    .filter((id): id is string => Boolean(id));

  const [{ data: mesas }, { data: sillas }] = await Promise.all([
    mesaIds.length
      ? supabase.from("mesas").select("id, numero").in("id", mesaIds)
      : Promise.resolve({ data: [] as { id: string; numero: string }[] }),
    sillaIds.length
      ? supabase
          .from("sillas_barra")
          .select("id, numero, barra_id")
          .in("id", sillaIds)
      : Promise.resolve({
          data: [] as { id: string; numero: string; barra_id: string }[],
        }),
  ]);

  const barraIds = [...new Set((sillas ?? []).map((s) => s.barra_id))];
  const { data: barras } = barraIds.length
    ? await supabase.from("barras").select("id, nombre").in("id", barraIds)
    : { data: [] as { id: string; nombre: string }[] };

  const nombrePorMesa = new Map((mesas ?? []).map((m) => [m.id, m.numero]));
  const sillaPorId = new Map((sillas ?? []).map((s) => [s.id, s]));
  const nombrePorBarra = new Map((barras ?? []).map((b) => [b.id, b.nombre]));

  for (const ubicacion of ubicaciones ?? []) {
    let etiqueta = "Cuenta";
    if (ubicacion.mesa_id) {
      etiqueta = nombrePorMesa.get(ubicacion.mesa_id) ?? etiqueta;
    } else if (ubicacion.silla_barra_id) {
      const silla = sillaPorId.get(ubicacion.silla_barra_id);
      if (silla) {
        const nombreBarra = nombrePorBarra.get(silla.barra_id) ?? "Barra";
        etiqueta = `${nombreBarra} · Silla ${silla.numero}`;
      }
    }
    resultado.set(ubicacion.cuenta_id, etiqueta);
  }

  return resultado;
}

/** ids de mesa/silla que ya tienen una cuenta abierta, para calcular libres */
async function idsOcupados(
  sedeId: string,
  columna: "mesa_id" | "silla_barra_id"
): Promise<Set<string>> {
  const supabase = await createClient();

  const { data: cuentasAbiertas } = await supabase
    .from("cuentas")
    .select("id")
    .eq("sede_id", sedeId)
    .eq("estado", "abierta");

  const cuentaIds = (cuentasAbiertas ?? []).map((c) => c.id);
  if (!cuentaIds.length) return new Set();

  const { data: ubicaciones } = await supabase
    .from("cuenta_ubicaciones")
    .select("mesa_id, silla_barra_id")
    .in("cuenta_id", cuentaIds);

  const valores = (ubicaciones ?? []).map((u) =>
    columna === "mesa_id" ? u.mesa_id : u.silla_barra_id
  );

  return new Set(valores.filter((id): id is string => Boolean(id)));
}

/** Mesas activas sin cuenta abierta ahora mismo. */
export async function mesasLibres(
  sedeId: string
): Promise<{ id: string; etiqueta: string }[]> {
  const supabase = await createClient();
  const [ocupadas, { data: mesas }] = await Promise.all([
    idsOcupados(sedeId, "mesa_id"),
    supabase
      .from("mesas")
      .select("id, numero")
      .eq("sede_id", sedeId)
      .eq("activa", true)
      .order("numero"),
  ]);

  return (mesas ?? [])
    .filter((m) => !ocupadas.has(m.id))
    .map((m) => ({ id: m.id, etiqueta: m.numero }));
}

/** Sillas de barra activas sin cuenta abierta ahora mismo. */
export async function sillasLibres(
  sedeId: string
): Promise<{ id: string; etiqueta: string }[]> {
  const supabase = await createClient();
  const [ocupadas, { data: barras }] = await Promise.all([
    idsOcupados(sedeId, "silla_barra_id"),
    supabase
      .from("barras")
      .select("id, nombre")
      .eq("sede_id", sedeId)
      .eq("activa", true),
  ]);

  const barraIds = (barras ?? []).map((b) => b.id);
  if (!barraIds.length) return [];

  const { data: sillas } = await supabase
    .from("sillas_barra")
    .select("id, numero, barra_id")
    .in("barra_id", barraIds)
    .eq("activa", true)
    .order("numero");

  const nombrePorBarra = new Map((barras ?? []).map((b) => [b.id, b.nombre]));

  return (sillas ?? [])
    .filter((s) => !ocupadas.has(s.id))
    .map((s) => ({
      id: s.id,
      etiqueta: `${nombrePorBarra.get(s.barra_id) ?? "Barra"} · Silla ${s.numero}`,
    }));
}
