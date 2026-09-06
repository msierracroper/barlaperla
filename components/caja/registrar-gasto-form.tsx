"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registrarGasto } from "@/app/caja/gastos/actions";
import { inputClass, selectClass, buttonPrimaryClass } from "@/components/ui/form-controls";
import { MoneyInput } from "@/components/ui/money-input";

interface Categoria {
  id: string;
  nombre: string;
}

export function RegistrarGastoForm({
  jornadaId,
  categorias,
}: {
  jornadaId: string;
  categorias: Categoria[];
}) {
  const router = useRouter();
  const [categoriaId, setCategoriaId] = useState("");
  const [montoStr, setMontoStr] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function registrar() {
    setError(null);
    startTransition(async () => {
      try {
        await registrarGasto(jornadaId, categoriaId || null, Number(montoStr) || 0, descripcion);
        setMontoStr("");
        setDescripcion("");
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "No se pudo registrar el gasto."
        );
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <select
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value)}
          className={`${selectClass} flex-1 min-w-40`}
        >
          <option value="">Sin categoría</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
        <MoneyInput
          value={montoStr}
          onChange={setMontoStr}
          placeholder="Monto"
          className={`${inputClass} w-32`}
        />
      </div>
      <input
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        placeholder="Descripción (opcional)"
        className={inputClass}
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="button"
        onClick={registrar}
        disabled={pending || !montoStr}
        className={buttonPrimaryClass}
      >
        {pending ? "Guardando..." : "Registrar gasto"}
      </button>
    </div>
  );
}
