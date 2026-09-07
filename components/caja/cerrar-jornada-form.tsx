"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cerrarJornada } from "@/app/caja/actions";
import { inputClass, buttonPrimaryClass } from "@/components/ui/form-controls";
import { MoneyInput } from "@/components/ui/money-input";

export function CerrarJornadaForm({
  jornadaId,
  efectivoEsperado,
}: {
  jornadaId: string;
  efectivoEsperado: number;
}) {
  const router = useRouter();
  const [efectivoStr, setEfectivoStr] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirmar() {
    setError(null);
    startTransition(async () => {
      try {
        await cerrarJornada(jornadaId, Number(efectivoStr) || 0);
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "No se pudo cerrar la jornada."
        );
      }
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm text-white/70">
        Efectivo contado (arqueo)
        <MoneyInput
          value={efectivoStr}
          onChange={setEfectivoStr}
          className={`${inputClass} w-40`}
        />
      </label>
      <p className="text-xs text-white/50">
        Esperado: ${efectivoEsperado.toLocaleString("es-CO")}
      </p>
      <button
        type="button"
        onClick={confirmar}
        disabled={pending || !efectivoStr}
        className={buttonPrimaryClass}
      >
        {pending ? "Cerrando..." : "Cerrar jornada"}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
