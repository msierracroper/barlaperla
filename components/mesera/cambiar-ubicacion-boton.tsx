"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { moverCuenta } from "@/app/mesera/cuentas/[cuentaId]/actions";
import type { CuentaTipo } from "@/types/database.types";

interface Libre {
  id: string;
  etiqueta: string;
}

export function CambiarUbicacionBoton({
  cuentaId,
  tipo,
  libres,
}: {
  cuentaId: string;
  tipo: CuentaTipo;
  libres: Libre[];
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function mover(nuevaId: string) {
    setError(null);
    startTransition(async () => {
      try {
        await moverCuenta(cuentaId, tipo, nuevaId);
        setAbierto(false);
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "No se pudo mover la cuenta."
        );
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition hover:bg-white/10"
      >
        {tipo === "mesa" ? "Cambiar mesa" : "Cambiar silla"}
      </button>

      {abierto && (
        <div className="mt-2 rounded-lg border border-white/10 bg-white/5 backdrop-blur-xl p-3">
          {libres.length ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {libres.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => mover(l.id)}
                  disabled={pending}
                  className="rounded-md border border-white/10 bg-white/5 px-2 py-2 text-xs text-white transition hover:bg-white/10 disabled:opacity-50"
                >
                  {l.etiqueta}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-white/50">
              No hay {tipo === "mesa" ? "mesas" : "sillas"} libres ahora.
            </p>
          )}
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}
