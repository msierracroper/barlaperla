"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registrarPago } from "@/app/caja/cuentas/[cuentaId]/actions";
import { inputClass, buttonPrimaryClass } from "@/components/ui/form-controls";
import { MoneyInput } from "@/components/ui/money-input";
import type { MetodoPago } from "@/types/database.types";

const METODOS: { value: MetodoPago; label: string }[] = [
  { value: "efectivo", label: "$ Efectivo" },
  { value: "transferencia", label: "⇄ Transferencia" },
  { value: "mixto", label: "◐ Mixto" },
];

export function PagoForm({
  cuentaId,
  subcuentaId,
  total,
}: {
  cuentaId: string;
  subcuentaId: string;
  total: number;
}) {
  const router = useRouter();
  const [metodo, setMetodo] = useState<MetodoPago>("efectivo");
  const [efectivoRecibidoStr, setEfectivoRecibidoStr] = useState(String(total));
  const [efectivoMixtoStr, setEfectivoMixtoStr] = useState(String(total));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const efectivoRecibido = Number(efectivoRecibidoStr) || 0;
  const efectivoMixto = Number(efectivoMixtoStr) || 0;

  const { montoEfectivo, montoTransferencia, cambio, faltante } = useMemo(() => {
    if (metodo === "efectivo") {
      const recibido = Math.max(0, efectivoRecibido);
      return {
        montoEfectivo: total,
        montoTransferencia: 0,
        cambio: Math.max(0, recibido - total),
        faltante: Math.max(0, total - recibido),
      };
    }
    if (metodo === "transferencia") {
      return { montoEfectivo: 0, montoTransferencia: total, cambio: 0, faltante: 0 };
    }
    const efectivo = Math.min(Math.max(0, efectivoMixto), total);
    return {
      montoEfectivo: efectivo,
      montoTransferencia: total - efectivo,
      cambio: 0,
      faltante: 0,
    };
  }, [metodo, efectivoRecibido, efectivoMixto, total]);

  const puedeCobrar = metodo !== "efectivo" || faltante === 0;

  function confirmar() {
    setError(null);
    startTransition(async () => {
      try {
        await registrarPago(cuentaId, subcuentaId, {
          metodo,
          montoEfectivo,
          montoTransferencia,
          montoTotal: total,
        });
        router.push("/caja");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "No se pudo registrar el pago."
        );
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {METODOS.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => setMetodo(m.value)}
            className={`flex-1 rounded-md border px-3 py-2 text-sm transition ${
              metodo === m.value
                ? "border-perla-verde-claro bg-perla-verde-claro/15 text-perla-verde-claro"
                : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {metodo === "efectivo" && (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-sm text-white/70">
            Efectivo recibido
            <MoneyInput
              value={efectivoRecibidoStr}
              onChange={setEfectivoRecibidoStr}
              className={inputClass}
            />
          </label>
          {faltante > 0 ? (
            <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">
              Falta ${faltante.toLocaleString("es-CO")}
            </p>
          ) : cambio > 0 ? (
            <p className="rounded-md bg-perla-verde-claro/10 px-3 py-2 text-sm text-perla-verde-claro">
              Cambio a devolver: ${cambio.toLocaleString("es-CO")}
            </p>
          ) : null}
        </div>
      )}

      {metodo === "transferencia" && (
        <p className="text-sm text-white/70">
          Se registrará todo (${total.toLocaleString("es-CO")}) como
          transferencia.
        </p>
      )}

      {metodo === "mixto" && (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-sm text-white/70">
            Monto en efectivo
            <MoneyInput
              value={efectivoMixtoStr}
              onChange={setEfectivoMixtoStr}
              className={inputClass}
            />
          </label>
          <div className="flex items-center justify-between rounded-md bg-perla-verde-claro/10 px-3 py-2 text-sm">
            <span className="text-white/70">Transferencia</span>
            <span className="font-semibold text-perla-verde-claro">
              ${montoTransferencia.toLocaleString("es-CO")}
            </span>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={confirmar}
        disabled={pending || total <= 0 || !puedeCobrar}
        className={buttonPrimaryClass}
      >
        {pending
          ? "Cobrando..."
          : `Registrar pago y cerrar · $${total.toLocaleString("es-CO")}`}
      </button>
    </div>
  );
}
