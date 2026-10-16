"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { guardarTamanoShotMl } from "@/app/admin/inventario/actions";
import { buttonSecondaryClass } from "@/components/ui/form-controls";

export function TamanoShotInput({
  sedeId,
  tamanoActual,
}: {
  sedeId: string;
  tamanoActual: number;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [valorStr, setValorStr] = useState(String(tamanoActual));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function guardar() {
    setError(null);
    startTransition(async () => {
      try {
        await guardarTamanoShotMl(sedeId, Number(valorStr) || 0);
        setEditando(false);
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "No se pudo guardar el tamaño del shot."
        );
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 backdrop-blur-xl p-3">
      <div>
        <p className="text-sm font-medium text-white">Tamaño del shot</p>
        <p className="text-xs text-white/50">
          Cuántos ml se descuentan por cada shot vendido.
        </p>
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>
      {editando ? (
        <div className="flex items-center gap-1.5">
          <input
            autoFocus
            type="number"
            min="1"
            value={valorStr}
            onChange={(e) => setValorStr(e.target.value)}
            className="w-20 rounded border border-white/20 bg-white/5 px-2 py-1 text-white outline-none focus:border-perla-dorado"
          />
          <span className="text-xs text-white/50">ml</span>
          <button
            type="button"
            onClick={guardar}
            disabled={pending}
            className={buttonSecondaryClass}
          >
            {pending ? "..." : "Guardar"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditando(false);
              setError(null);
            }}
            className="text-white/40 hover:text-white/70"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setValorStr(String(tamanoActual));
            setEditando(true);
          }}
          className={buttonSecondaryClass}
        >
          {tamanoActual} ml · Corregir
        </button>
      )}
    </div>
  );
}
