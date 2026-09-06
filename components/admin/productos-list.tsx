"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  crearProducto,
  actualizarProducto,
  toggleProductoActivo,
  type DatosProducto,
} from "@/app/admin/productos/actions";
import { Switch } from "@/components/ui/switch";
import { MoneyInput } from "@/components/ui/money-input";
import {
  inputClass,
  selectClass,
  buttonPrimaryClass,
  buttonSecondaryClass,
} from "@/components/ui/form-controls";
import type { ControlInventarioTipo } from "@/types/database.types";

interface Producto {
  id: string;
  nombre: string;
  precio_venta: number;
  categoria_id: string | null;
  control_inventario: ControlInventarioTipo;
  licor_base_id: string | null;
  stock_minimo: number | null;
  activo: boolean;
  categorias_producto: { nombre: string } | null;
}

interface Categoria {
  id: string;
  nombre: string;
}

interface Licor {
  id: string;
  nombre: string;
}

const ETIQUETA_CONTROL: Record<ControlInventarioTipo, string> = {
  simple: "Simple",
  licor_multiuso: "Licor",
  receta: "Receta",
  shot_de_licor: "Shot",
};

const TAB_TODOS = "__todos__";

export function ProductosList({
  productos,
  categorias,
  licores,
}: {
  productos: Producto[];
  categorias: Categoria[];
  licores: Licor[];
}) {
  const [tabActiva, setTabActiva] = useState(TAB_TODOS);
  const [modal, setModal] = useState<"crear" | Producto | null>(null);
  const [pendingToggle, startToggle] = useTransition();

  const visibles =
    tabActiva === TAB_TODOS
      ? productos
      : productos.filter((p) => p.categoria_id === tabActiva);
  const activos = productos.filter((p) => p.activo).length;
  const inactivos = productos.length - activos;

  function alternar(producto: Producto) {
    startToggle(async () => {
      await toggleProductoActivo(producto.id, !producto.activo);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-perla-dorado">Productos</h2>
          <p className="text-xs text-white/50">
            {activos} activos · {inactivos} inactivos
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModal("crear")}
          className={buttonPrimaryClass}
        >
          + Nuevo
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setTabActiva(TAB_TODOS)}
          className={`shrink-0 rounded-md px-3 py-1.5 text-sm transition ${
            tabActiva === TAB_TODOS
              ? "bg-perla-dorado font-semibold text-perla-azul-deep"
              : "bg-white/5 text-white/70 hover:bg-white/10"
          }`}
        >
          Todos
        </button>
        {categorias.map((categoria) => (
          <button
            key={categoria.id}
            type="button"
            onClick={() => setTabActiva(categoria.id)}
            className={`shrink-0 rounded-md px-3 py-1.5 text-sm transition ${
              tabActiva === categoria.id
                ? "bg-perla-dorado font-semibold text-perla-azul-deep"
                : "bg-white/5 text-white/70 hover:bg-white/10"
            }`}
          >
            {categoria.nombre}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {visibles.map((producto) => (
          <div
            key={producto.id}
            className="flex items-center justify-between rounded-lg border border-white/10 bg-perla-azul p-3"
          >
            <div>
              <p className="font-medium text-white">{producto.nombre}</p>
              <div className="mt-1 flex items-center gap-2 text-xs">
                {producto.categorias_producto && (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-white/60">
                    {producto.categorias_producto.nombre}
                  </span>
                )}
                <span className="text-perla-dorado">
                  ${producto.precio_venta.toLocaleString("es-CO")}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {producto.control_inventario === "receta" && (
                <Link
                  href={`/admin/productos/${producto.id}/receta`}
                  className={buttonSecondaryClass}
                >
                  Receta
                </Link>
              )}
              <button
                type="button"
                onClick={() => setModal(producto)}
                aria-label="Editar"
                className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-white/80 transition hover:bg-white/20"
              >
                ✏️
              </button>
              <Switch
                checked={producto.activo}
                onChange={() => alternar(producto)}
                disabled={pendingToggle}
              />
            </div>
          </div>
        ))}
        {!visibles.length && (
          <p className="py-6 text-center text-sm text-white/50">
            No hay productos en esta categoría.
          </p>
        )}
      </div>

      {modal && (
        <ProductoModal
          producto={modal === "crear" ? null : modal}
          categorias={categorias}
          licores={licores}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

function ProductoModal({
  producto,
  categorias,
  licores,
  onClose,
}: {
  producto: Producto | null;
  categorias: Categoria[];
  licores: Licor[];
  onClose: () => void;
}) {
  const [nombre, setNombre] = useState(producto?.nombre ?? "");
  const [precioStr, setPrecioStr] = useState(String(producto?.precio_venta ?? ""));
  const [categoriaId, setCategoriaId] = useState(producto?.categoria_id ?? "");
  const [control, setControl] = useState<ControlInventarioTipo>(
    producto?.control_inventario ?? "simple"
  );
  const [licorBaseId, setLicorBaseId] = useState(producto?.licor_base_id ?? "");
  const [stockMinimoStr, setStockMinimoStr] = useState(
    String(producto?.stock_minimo ?? 0)
  );
  const [activo, setActivo] = useState(producto?.activo ?? true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function guardar() {
    setError(null);
    const datos: DatosProducto = {
      nombre,
      categoriaId: categoriaId || null,
      precioVenta: Number(precioStr) || 0,
      controlInventario: control,
      licorBaseId: control === "shot_de_licor" ? licorBaseId || null : null,
      stockMinimo: Number(stockMinimoStr) || 0,
      activo,
    };

    startTransition(async () => {
      try {
        if (producto) {
          await actualizarProducto(producto.id, datos);
        } else {
          await crearProducto(datos);
        }
        onClose();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "No se pudo guardar el producto."
        );
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-sm rounded-t-2xl bg-perla-azul p-5 sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-perla-dorado">
            {producto ? "Editar producto" : "Nuevo producto"}
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

        <div className="mt-4 flex max-h-[70vh] flex-col gap-3 overflow-y-auto">
          <label className="flex flex-col gap-1 text-sm text-white/70">
            Nombre
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-white/70">
            Precio
            <MoneyInput
              value={precioStr}
              onChange={setPrecioStr}
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-white/70">
            Categoría
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className={selectClass}
            >
              <option value="">Sin categoría</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>

          <div>
            <p className="mb-1 text-sm text-white/70">Tipo de control</p>
            <div className="grid grid-cols-4 gap-2">
              {(
                ["simple", "licor_multiuso", "receta", "shot_de_licor"] as ControlInventarioTipo[]
              ).map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => setControl(tipo)}
                  className={`rounded-md border px-2 py-2 text-xs transition ${
                    control === tipo
                      ? "border-perla-dorado bg-perla-dorado/15 text-perla-dorado"
                      : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                  }`}
                >
                  {ETIQUETA_CONTROL[tipo]}
                </button>
              ))}
            </div>
          </div>

          {control === "shot_de_licor" && (
            <label className="flex flex-col gap-1 text-sm text-white/70">
              Licor base (a qué botella descuenta)
              <select
                value={licorBaseId}
                onChange={(e) => setLicorBaseId(e.target.value)}
                className={selectClass}
              >
                <option value="">Selecciona un licor</option>
                {licores.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nombre}
                  </option>
                ))}
              </select>
              {!licores.length && (
                <span className="text-xs text-amber-400">
                  No hay productos tipo &quot;Licor&quot; creados todavía.
                </span>
              )}
            </label>
          )}

          <label className="flex flex-col gap-1 text-sm text-white/70">
            Stock mínimo (opcional)
            <input
              type="number"
              min="0"
              step="1"
              value={stockMinimoStr}
              onChange={(e) => setStockMinimoStr(e.target.value)}
              className={inputClass}
            />
          </label>

          <div className="flex items-center justify-between rounded-md bg-white/5 px-3 py-2">
            <span className="text-sm text-white/70">Producto activo</span>
            <Switch checked={activo} onChange={() => setActivo((a) => !a)} />
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
            {pending ? "Guardando..." : "Guardar producto"}
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
