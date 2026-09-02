"use client";

import { useMemo, useState, useTransition } from "react";
import { enviarRonda } from "@/app/mesera/cuentas/[cuentaId]/actions";
import { buttonPrimaryClass } from "@/components/ui/form-controls";

interface Producto {
  id: string;
  nombre: string;
  precio_venta: number;
  categoria_id: string | null;
}

interface Categoria {
  id: string;
  nombre: string;
}

const TAB_TODOS = "__todos__";

export function MenuSelector({
  cuentaId,
  subcuentaId,
  categorias,
  productos,
}: {
  cuentaId: string;
  subcuentaId: string;
  categorias: Categoria[];
  productos: Producto[];
}) {
  const [tabActiva, setTabActiva] = useState(TAB_TODOS);
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const productosVisibles = useMemo(
    () =>
      tabActiva === TAB_TODOS
        ? productos
        : productos.filter((p) => p.categoria_id === tabActiva),
    [productos, tabActiva]
  );

  const totalItems = Object.values(cantidades).reduce((a, b) => a + b, 0);
  const totalPrecio = productos.reduce(
    (acc, p) => acc + (cantidades[p.id] ?? 0) * p.precio_venta,
    0
  );

  function ajustar(productoId: string, delta: number) {
    setCantidades((actual) => {
      const nueva = Math.max(0, (actual[productoId] ?? 0) + delta);
      return { ...actual, [productoId]: nueva };
    });
  }

  function enviar() {
    setError(null);
    const items = Object.entries(cantidades)
      .filter(([, cantidad]) => cantidad > 0)
      .map(([productoId, cantidad]) => ({ productoId, cantidad }));

    if (!items.length) return;

    startTransition(async () => {
      try {
        await enviarRonda(cuentaId, subcuentaId, items);
        setCantidades({});
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo enviar el pedido.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
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
        {productosVisibles.map((producto) => {
          const cantidad = cantidades[producto.id] ?? 0;
          return (
            <div
              key={producto.id}
              className="flex items-center justify-between rounded-lg border border-white/10 bg-perla-azul p-3"
            >
              <div>
                <p className="font-medium text-white">{producto.nombre}</p>
                <p className="text-xs text-white/50">
                  ${producto.precio_venta.toLocaleString("es-CO")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => ajustar(producto.id, -1)}
                  disabled={cantidad === 0}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-30"
                >
                  −
                </button>
                <span className="w-5 text-center text-white">{cantidad}</span>
                <button
                  type="button"
                  onClick={() => ajustar(producto.id, 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-perla-rojo text-white transition hover:brightness-110"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
        {!productosVisibles.length && (
          <p className="py-6 text-center text-sm text-white/50">
            No hay productos en esta categoría.
          </p>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      {totalItems > 0 && (
        <div className="sticky bottom-3 flex items-center justify-between gap-3 rounded-lg border border-perla-dorado/40 bg-perla-azul-deep p-3 shadow-lg">
          <div className="text-sm text-white">
            <span className="font-semibold">{totalItems}</span> item
            {totalItems === 1 ? "" : "s"} · $
            {totalPrecio.toLocaleString("es-CO")}
          </div>
          <button
            type="button"
            onClick={enviar}
            disabled={pending}
            className={buttonPrimaryClass}
          >
            {pending ? "Enviando..." : "Enviar pedido"}
          </button>
        </div>
      )}
    </div>
  );
}
