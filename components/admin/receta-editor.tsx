"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  agregarIngrediente,
  quitarIngrediente,
} from "@/app/admin/productos/[productoId]/receta/actions";
import { Card } from "@/components/ui/card";
import { inputClass, selectClass, buttonPrimaryClass, buttonDangerClass } from "@/components/ui/form-controls";

interface IngredienteReceta {
  id: string;
  cantidadMl: number;
  ingredienteId: string;
  ingredienteNombre: string;
}

interface Licor {
  id: string;
  nombre: string;
}

export function RecetaEditor({
  productoCoctelId,
  receta,
  licores,
}: {
  productoCoctelId: string;
  receta: IngredienteReceta[];
  licores: Licor[];
}) {
  const router = useRouter();
  const [ingredienteId, setIngredienteId] = useState("");
  const [cantidadStr, setCantidadStr] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function agregar() {
    setError(null);
    startTransition(async () => {
      try {
        await agregarIngrediente(productoCoctelId, ingredienteId, Number(cantidadStr) || 0);
        setIngredienteId("");
        setCantidadStr("");
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "No se pudo agregar el ingrediente."
        );
      }
    });
  }

  function quitar(recetaId: string) {
    startTransition(async () => {
      await quitarIngrediente(recetaId, productoCoctelId);
      router.refresh();
    });
  }

  return (
    <Card>
      {!licores.length && (
        <p className="mb-3 text-sm text-amber-400">
          No hay productos tipo &quot;Licor&quot; creados todavía -- crea uno primero en
          Productos para poder usarlo como ingrediente.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {receta.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2"
          >
            <span className="text-sm text-white">
              {r.ingredienteNombre} · {r.cantidadMl}ml
            </span>
            <button
              type="button"
              onClick={() => quitar(r.id)}
              disabled={pending}
              className={buttonDangerClass}
            >
              Quitar
            </button>
          </div>
        ))}
        {!receta.length && (
          <p className="text-sm text-white/50">Todavía no hay ingredientes.</p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-white/10 pt-4">
        <label className="flex flex-1 flex-col gap-1 text-sm text-white/70">
          Ingrediente
          <select
            value={ingredienteId}
            onChange={(e) => setIngredienteId(e.target.value)}
            className={selectClass}
          >
            <option value="">Selecciona un licor</option>
            {licores.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="flex w-28 flex-col gap-1 text-sm text-white/70">
          ml
          <input
            type="number"
            min="1"
            value={cantidadStr}
            onChange={(e) => setCantidadStr(e.target.value)}
            className={inputClass}
          />
        </label>
        <button
          type="button"
          onClick={agregar}
          disabled={pending || !ingredienteId || !cantidadStr}
          className={buttonPrimaryClass}
        >
          Agregar
        </button>
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
    </Card>
  );
}
