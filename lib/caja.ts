import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface ResumenCaja {
  efectivo: number;
  transferencia: number;
  fiado: number;
  total: number;
  cantidadPagos: number;
}

const RESUMEN_VACIO: ResumenCaja = {
  efectivo: 0,
  transferencia: 0,
  fiado: 0,
  total: 0,
  cantidadPagos: 0,
};

/**
 * Suma todos los pagos registrados durante una jornada (para todas sus
 * cuentas, abiertas o ya cerradas), usado tanto para mostrar el resumen en
 * vivo como para el arqueo de cierre de caja.
 */
export async function calcularResumenCaja(
  jornadaId: string
): Promise<ResumenCaja> {
  const supabase = await createClient();

  const { data: cuentas } = await supabase
    .from("cuentas")
    .select("id")
    .eq("jornada_id", jornadaId);

  const cuentaIds = (cuentas ?? []).map((c) => c.id);
  if (!cuentaIds.length) return RESUMEN_VACIO;

  const { data: subcuentas } = await supabase
    .from("subcuentas")
    .select("id")
    .in("cuenta_id", cuentaIds);

  const subcuentaIds = (subcuentas ?? []).map((s) => s.id);
  if (!subcuentaIds.length) return RESUMEN_VACIO;

  const { data: pagos } = await supabase
    .from("pagos")
    .select("monto_efectivo, monto_transferencia, monto_fiado, monto_total")
    .in("subcuenta_id", subcuentaIds);

  return (pagos ?? []).reduce(
    (acc, p) => ({
      efectivo: acc.efectivo + p.monto_efectivo,
      transferencia: acc.transferencia + p.monto_transferencia,
      fiado: acc.fiado + p.monto_fiado,
      total: acc.total + p.monto_total,
      cantidadPagos: acc.cantidadPagos + 1,
    }),
    { ...RESUMEN_VACIO }
  );
}
