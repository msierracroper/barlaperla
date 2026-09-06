"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { corregirCostoPromedio } from "@/app/admin/inventario/actions";
import { buttonSecondaryClass } from "@/components/ui/form-controls";
import { MoneyInput } from "@/components/ui/money-input";

export function EditarCostoPromedio({
  productoId,
  costoActual,
}: {
  productoId: string;
  costoActual: number;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [costoStr, setCostoStr] = useState(String(costoActual));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function guardar() {
    setError(null);
    startTransition(async () => {
      try {
        await corregirCostoPromedio(productoId, Number(costoStr) || 0);
        setEditando(false);
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "No se pudo corregir el costo."
        );
      }
    });
  }

  if (!editando) {
    return (
      <div className="flex items-center justify-between text-xs text-white/40">
        <span>
          Costo promedio: <span className="text-white/70">${costoActual.toLocaleString("es-CO")}</span>
        </span>
        <button
          type="button"
          onClick={() => {
            setCostoStr(String(costoActual));
            setEditando(true);
          }}
          className={buttonSecondaryClass}
        >
          Corregir
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 text-xs">
      <span className="text-white/40">Corregir costo promedio</span>
      <div className="flex items-center gap-1.5">
        <MoneyInput
          value={costoStr}
          onChange={setCostoStr}
          className="w-24 rounded border border-white/20 bg-white/5 px-2 py-1 text-white outline-none focus:border-perla-dorado"
        />
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
      {error && <p className="text-red-400">{error}</p>}
    </div>
  );
}
