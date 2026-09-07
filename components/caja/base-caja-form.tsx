"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { actualizarBaseCaja } from "@/app/caja/actions";
import { inputClass, buttonPrimaryClass } from "@/components/ui/form-controls";
import { MoneyInput } from "@/components/ui/money-input";

export function BaseCajaForm({
  jornadaId,
  baseActual,
}: {
  jornadaId: string;
  baseActual: number;
}) {
  const router = useRouter();
  const [baseStr, setBaseStr] = useState(String(baseActual));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function guardar() {
    setError(null);
    startTransition(async () => {
      try {
        await actualizarBaseCaja(jornadaId, Number(baseStr) || 0);
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "No se pudo guardar la base."
        );
      }
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm text-white/70">
        Base de caja inicial
        <MoneyInput
          value={baseStr}
          onChange={setBaseStr}
          className={`${inputClass} w-40`}
        />
      </label>
      <button
        type="button"
        onClick={guardar}
        disabled={pending}
        className={buttonPrimaryClass}
      >
        {pending ? "Guardando..." : "Guardar base"}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
