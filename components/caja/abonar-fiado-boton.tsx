"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registrarAbono } from "@/app/caja/fiados/actions";
import { inputClass, selectClass, buttonPrimaryClass } from "@/components/ui/form-controls";
import { MoneyInput } from "@/components/ui/money-input";

export function AbonarFiadoBoton({
  fiadoId,
  saldo,
}: {
  fiadoId: string;
  saldo: number;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [montoStr, setMontoStr] = useState(String(saldo));
  const [metodo, setMetodo] = useState<"efectivo" | "transferencia">("efectivo");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const monto = Number(montoStr) || 0;

  function confirmar() {
    setError(null);
    startTransition(async () => {
      try {
        await registrarAbono(fiadoId, monto, metodo);
        setAbierto(false);
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "No se pudo registrar el abono."
        );
      }
    });
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className={buttonPrimaryClass}
      >
        Abonar
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-white/10 bg-white/5 p-3">
      <div className="flex gap-2">
        <MoneyInput value={montoStr} onChange={setMontoStr} className={`${inputClass} flex-1`} />
        <select
          value={metodo}
          onChange={(e) => setMetodo(e.target.value as "efectivo" | "transferencia")}
          className={`${selectClass} w-36`}
        >
          <option value="efectivo">Efectivo</option>
          <option value="transferencia">Transferencia</option>
        </select>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={confirmar}
          disabled={pending || monto <= 0 || monto > saldo + 0.01}
          className={buttonPrimaryClass}
        >
          {pending ? "Guardando..." : "Confirmar abono"}
        </button>
        <button
          type="button"
          onClick={() => {
            setAbierto(false);
            setError(null);
          }}
          className="text-sm text-white/60 hover:text-white"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
