import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface ResumenCaja {
  efectivo: number;
  transferencia: number;
  fiado: number;
  gastos: number;
  total: number;
  cantidadPagos: number;
}

const RESUMEN_VACIO: ResumenCaja = {
  efectivo: 0,
  transferencia: 0,
  fiado: 0,
  gastos: 0,
  total: 0,
  cantidadPagos: 0,
};

/**
 * Resumen de dinero de una jornada: pagos + abonos de fiado (entran a caja)
 * menos gastos (salen de caja). Usado tanto para mostrar el resumen en vivo
 * como para el arqueo de cierre.
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

  let subcuentaIds: string[] = [];
  if (cuentaIds.length) {
    const { data: subcuentas } = await supabase
      .from("subcuentas")
      .select("id")
      .in("cuenta_id", cuentaIds);
    subcuentaIds = (subcuentas ?? []).map((s) => s.id);
  }

  const [{ data: pagos }, { data: abonos }, { data: gastos }] = await Promise.all([
    subcuentaIds.length
      ? supabase
          .from("pagos")
          .select("monto_efectivo, monto_transferencia, monto_fiado, monto_total")
          .in("subcuenta_id", subcuentaIds)
      : Promise.resolve({
          data: [] as {
            monto_efectivo: number;
            monto_transferencia: number;
            monto_fiado: number;
            monto_total: number;
          }[],
        }),
    supabase.from("fiado_abonos").select("monto, metodo").eq("jornada_id", jornadaId),
    supabase.from("gastos").select("monto").eq("jornada_id", jornadaId),
  ]);

  const resumenPagos = (pagos ?? []).reduce(
    (acc, p) => ({
      ...acc,
      efectivo: acc.efectivo + p.monto_efectivo,
      transferencia: acc.transferencia + p.monto_transferencia,
      fiado: acc.fiado + p.monto_fiado,
      total: acc.total + p.monto_total,
      cantidadPagos: acc.cantidadPagos + 1,
    }),
    { ...RESUMEN_VACIO }
  );

  // Un abono SI es dinero que entra a caja hoy (a diferencia del monto_fiado
  // de arriba, que es lo que quedo pendiente por cobrar) -- suma a
  // efectivo/transferencia segun como se recibio, no al bucket "fiado".
  const resumenConAbonos = (abonos ?? []).reduce((acc, a) => {
    if (a.metodo === "transferencia") {
      return { ...acc, transferencia: acc.transferencia + a.monto, total: acc.total + a.monto };
    }
    return { ...acc, efectivo: acc.efectivo + a.monto, total: acc.total + a.monto };
  }, resumenPagos);

  // Los gastos se asumen en efectivo (salida de la caja fisica) -- el
  // alcance no distingue metodo de pago para gastos, a diferencia de pagos/abonos.
  const totalGastos = (gastos ?? []).reduce((acc, g) => acc + g.monto, 0);

  return { ...resumenConAbonos, gastos: totalGastos };
}
