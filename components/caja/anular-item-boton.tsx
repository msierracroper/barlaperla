"use client";

import { useState, useTransition } from "react";
import { anularItem } from "@/app/caja/cuentas/[cuentaId]/actions";
import { inputClass, buttonDangerClass } from "@/components/ui/form-controls";

export function AnularItemBoton({
  cuentaId,
  itemId,
}: {
  cuentaId: string;
  itemId: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirmar() {
    setError(null);
    startTransition(async () => {
      try {
        await anularItem(cuentaId, itemId, motivo);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo anular.");
      }
    });
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className={buttonDangerClass}
      >
        Anular
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        autoFocus
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Motivo"
        className={`${inputClass} w-32 py-1 text-xs`}
      />
      <button
        type="button"
        onClick={confirmar}
        disabled={pending || !motivo.trim()}
        className="rounded-md bg-red-500/20 px-2 py-1 text-xs text-red-300 hover:bg-red-500/30 disabled:opacity-50"
      >
        {pending ? "..." : "Confirmar"}
      </button>
      <button
        type="button"
        onClick={() => {
          setAbierto(false);
          setError(null);
        }}
        className="text-xs text-white/40 hover:text-white/70"
      >
        ✕
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
