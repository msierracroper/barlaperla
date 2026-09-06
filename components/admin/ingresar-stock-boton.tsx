"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ingresarStockSimple,
  ingresarBotellas,
} from "@/app/admin/inventario/actions";
import { inputClass, buttonPrimaryClass } from "@/components/ui/form-controls";
import { MoneyInput } from "@/components/ui/money-input";
import type { ControlInventarioTipo } from "@/types/database.types";

export function IngresarStockBoton({
  productoId,
  tipo,
}: {
  productoId: string;
  tipo: ControlInventarioTipo;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [cantidadStr, setCantidadStr] = useState("");
  const [costoStr, setCostoStr] = useState("");
  const [volumenStr, setVolumenStr] = useState("750");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const cantidad = Number(cantidadStr) || 0;
  const costo = Number(costoStr) || 0;
  const volumen = Number(volumenStr) || 0;

  function confirmar() {
    setError(null);
    startTransition(async () => {
      try {
        if (tipo === "simple") {
          await ingresarStockSimple(productoId, cantidad, costo);
        } else {
          await ingresarBotellas(productoId, cantidad, costo, volumen);
        }
        setAbierto(false);
        setCantidadStr("");
        setCostoStr("");
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "No se pudo ingresar el stock."
        );
      }
    });
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className={`${buttonPrimaryClass} w-full text-sm`}
      >
        Ingresar stock
      </button>
    );
  }

  const puedeGuardar =
    cantidad > 0 && costo >= 0 && (tipo === "simple" || volumen > 0);

  return (
    <div className="flex flex-col gap-2 rounded-md border border-white/10 bg-white/5 p-3">
      <label className="flex flex-col gap-1 text-xs text-white/60">
        {tipo === "simple" ? "Unidades que entran" : "Botellas que entran"}
        <input
          autoFocus
          type="number"
          min="1"
          value={cantidadStr}
          onChange={(e) => setCantidadStr(e.target.value)}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-white/60">
        Costo unitario de compra
        <MoneyInput value={costoStr} onChange={setCostoStr} className={inputClass} />
      </label>
      {tipo !== "simple" && (
        <label className="flex flex-col gap-1 text-xs text-white/60">
          Volumen por botella (ml)
          <input
            type="number"
            min="1"
            value={volumenStr}
            onChange={(e) => setVolumenStr(e.target.value)}
            className={inputClass}
          />
        </label>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={confirmar}
          disabled={pending || !puedeGuardar}
          className={`${buttonPrimaryClass} flex-1 text-sm`}
        >
          {pending ? "Guardando..." : "Confirmar ingreso"}
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
