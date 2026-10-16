"use client";

import { useState, useTransition } from "react";
import {
  crearCategoria,
  actualizarCategoria,
  toggleCategoriaActiva,
  type DatosCategoria,
} from "@/app/admin/categorias/actions";
import { Switch } from "@/components/ui/switch";
import { inputClass, buttonPrimaryClass } from "@/components/ui/form-controls";

interface Categoria {
  id: string;
  nombre: string;
  activa: boolean;
}

export function CategoriasList({ categorias }: { categorias: Categoria[] }) {
  const [modal, setModal] = useState<"crear" | Categoria | null>(null);
  const [pendingToggle, startToggle] = useTransition();

  const activas = categorias.filter((c) => c.activa).length;
  const inactivas = categorias.length - activas;

  function alternar(categoria: Categoria) {
    startToggle(async () => {
      await toggleCategoriaActiva(categoria.id, !categoria.activa);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl text-perla-dorado">
            Categorías
          </h2>
          <p className="text-xs text-white/50">
            {activas} activas · {inactivas} inactivas
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModal("crear")}
          className={buttonPrimaryClass}
        >
          + Nueva
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {categorias.map((categoria) => (
          <div
            key={categoria.id}
            className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 backdrop-blur-xl p-3"
          >
            <p className="font-medium text-white">{categoria.nombre}</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setModal(categoria)}
                aria-label="Editar"
                className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-white/80 transition hover:bg-white/20"
              >
                ✏️
              </button>
              <Switch
                checked={categoria.activa}
                onChange={() => alternar(categoria)}
                disabled={pendingToggle}
              />
            </div>
          </div>
        ))}
        {!categorias.length && (
          <p className="py-6 text-center text-sm text-white/50">
            No hay categorías todavía.
          </p>
        )}
      </div>

      {modal && (
        <CategoriaModal
          categoria={modal === "crear" ? null : modal}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

function CategoriaModal({
  categoria,
  onClose,
}: {
  categoria: Categoria | null;
  onClose: () => void;
}) {
  const [nombre, setNombre] = useState(categoria?.nombre ?? "");
  const [activa, setActiva] = useState(categoria?.activa ?? true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function guardar() {
    setError(null);
    const datos: DatosCategoria = { nombre, activa };

    startTransition(async () => {
      try {
        if (categoria) {
          await actualizarCategoria(categoria.id, datos);
        } else {
          await crearCategoria(datos);
        }
        onClose();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "No se pudo guardar la categoría."
        );
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-sm rounded-t-2xl bg-perla-azul p-5 sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg text-perla-dorado">
            {categoria ? "Editar categoría" : "Nueva categoría"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-white/50 hover:text-white"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-white/70">
            Nombre
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={inputClass}
            />
          </label>

          <div className="flex items-center justify-between rounded-md bg-white/5 px-3 py-2">
            <span className="text-sm text-white/70">Categoría activa</span>
            <Switch checked={activa} onChange={() => setActiva((a) => !a)} />
          </div>

          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={guardar}
            disabled={pending}
            className={buttonPrimaryClass}
          >
            {pending ? "Guardando..." : "Guardar categoría"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-center text-sm text-white/60 hover:text-white"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
