"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/auth/roles";
import type { MetodoPago } from "@/types/database.types";

export interface DatosPago {
  metodo: MetodoPago;
  montoEfectivo: number;
  montoTransferencia: number;
  montoTotal: number;
}

export async function registrarPago(
  cuentaId: string,
  subcuentaId: string,
  pago: DatosPago
) {
  const usuario = await requireRol("cajero");
  const { metodo, montoTotal, montoEfectivo, montoTransferencia } = pago;

  if (!Number.isFinite(montoTotal) || montoTotal <= 0) {
    throw new Error("El total a cobrar no es válido.");
  }
  if (Math.round(montoEfectivo + montoTransferencia) !== Math.round(montoTotal)) {
    throw new Error(
      "La suma de efectivo y transferencia debe ser igual al total."
    );
  }

  const supabase = await createClient();

  const { error: errorPago } = await supabase.from("pagos").insert({
    subcuenta_id: subcuentaId,
    metodo,
    monto_efectivo: montoEfectivo,
    monto_transferencia: montoTransferencia,
    monto_fiado: 0,
    monto_total: montoTotal,
    registrado_por: usuario.id,
  });
  if (errorPago) {
    throw new Error(`No se pudo registrar el pago: ${errorPago.message}`);
  }

  const { error: errorSub } = await supabase
    .from("subcuentas")
    .update({ estado: "cerrada" })
    .eq("id", subcuentaId);
  if (errorSub) {
    throw new Error(`No se pudo cerrar la sub-cuenta: ${errorSub.message}`);
  }

  const { error: errorCuenta } = await supabase
    .from("cuentas")
    .update({ estado: "cerrada", cerrada_at: new Date().toISOString() })
    .eq("id", cuentaId);
  if (errorCuenta) {
    throw new Error(`No se pudo cerrar la cuenta: ${errorCuenta.message}`);
  }

  revalidatePath("/caja");
  revalidatePath("/mesera");
  revalidatePath("/cocina");
}
