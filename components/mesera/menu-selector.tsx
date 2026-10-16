"use client";

import { useMemo, useState, useTransition } from "react";
import { enviarRonda } from "@/app/mesera/cuentas/[cuentaId]/actions";
import { buttonPrimaryClass } from "@/components/ui/form-controls";

interface Producto {
  id: string;
  nombre: string;
  precio_venta: number;
  categoria_id: string | null;
  stockDisponible: number | null;
}

interface Categoria {
  id: string;
  nombre: string;
}

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
  const [tabActiva, setTabActiva] = useState(categorias[0]?.id ?? "");
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [revisando, setRevisando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const productosVisibles = useMemo(
    () => productos.filter((p) => p.categoria_id === tabActiva),
    [productos, tabActiva]
  );

  const productoPorId = useMemo(
    () => new Map(productos.map((p) => [p.id, p])),
    [productos]
  );

  const lineasCarrito = useMemo(
    () =>
      Object.entries(cantidades)
        .filter(([, cantidad]) => cantidad > 0)
        .map(([productoId, cantidad]) => ({
          producto: productoPorId.get(productoId),
          cantidad,
        }))
        .filter(
          (l): l is { producto: Producto; cantidad: number } => !!l.producto
        ),
    [cantidades, productoPorId]
  );

  const totalItems = lineasCarrito.reduce((a, l) => a + l.cantidad, 0);
  const totalPrecio = lineasCarrito.reduce(
    (acc, l) => acc + l.cantidad * l.producto.precio_venta,
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
    const items = lineasCarrito.map((l) => ({
      productoId: l.producto.id,
      cantidad: l.cantidad,
    }));

    if (!items.length) return;

    startTransition(async () => {
      try {
        await enviarRonda(cuentaId, subcuentaId, items);
        setCantidades({});
        setRevisando(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo enviar el pedido.");
      }
    });
  }

  if (revisando) {
    return (
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-white/50">
          Revisar pedido
        </h3>

        <div className="flex flex-col gap-2">
          {lineasCarrito.map((linea) => (
            <div
              key={linea.producto.id}
              className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 backdrop-blur-xl p-3"
            >
              <span className="text-white">
                {linea.cantidad}x {linea.producto.nombre}
              </span>
              <span className="text-perla-dorado">
                ${(linea.cantidad * linea.producto.precio_venta).toLocaleString("es-CO")}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-white/10 pt-3 font-display text-lg text-perla-dorado">
          <span>Total</span>
          <span>${totalPrecio.toLocaleString("es-CO")}</span>
        </div>

        {error && (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={enviar}
          disabled={pending}
          className={buttonPrimaryClass}
        >
          {pending ? "Enviando..." : "Enviar a preparación"}
        </button>
        <button
          type="button"
          onClick={() => setRevisando(false)}
          disabled={pending}
          className="text-center text-sm text-white/60 hover:text-white"
        >
          ← Editar pedido
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1 overflow-x-auto pb-1">
        {categorias.map((categoria) => (
          <button
            key={categoria.id}
            type="button"
            onClick={() => setTabActiva(categoria.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm transition ${
              tabActiva === categoria.id
                ? "bg-perla-dorado font-semibold text-perla-azul-deep shadow-[0_0_14px_-3px_rgba(242,193,78,0.7)]"
                : "bg-white/5 text-white/70 backdrop-blur-xl hover:bg-white/10"
            }`}
          >
            {categoria.nombre}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {productosVisibles.map((producto) => {
          const cantidad = cantidades[producto.id] ?? 0;
          const agotado = producto.stockDisponible !== null && producto.stockDisponible <= 0;
          const enElTope =
            producto.stockDisponible !== null && cantidad >= producto.stockDisponible;
          return (
            <div
              key={producto.id}
              className={`flex items-center justify-between rounded-lg border p-3 ${
                agotado
                  ? "border-white/5 bg-perla-azul/40 opacity-60"
                  : "border-white/10 bg-perla-azul"
              }`}
            >
              <div>
                <p className="font-medium text-white">{producto.nombre}</p>
                {agotado ? (
                  <p className="text-xs font-semibold uppercase text-red-400">
                    Agotado
                  </p>
                ) : (
                  <p className="text-xs text-white/50">
                    ${producto.precio_venta.toLocaleString("es-CO")}
                  </p>
                )}
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
                  disabled={agotado || enElTope}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-perla-magenta to-perla-naranja text-white shadow-[0_0_12px_-3px_rgba(255,77,141,0.7)] transition hover:brightness-110 disabled:opacity-30 disabled:shadow-none"
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

      {totalItems > 0 && (
        <div className="sticky bottom-3 flex items-center justify-between gap-3 rounded-xl border border-perla-dorado/40 bg-perla-azul-deep/90 p-3 shadow-lg backdrop-blur-xl">
          <div className="text-sm text-white">
            <span className="font-semibold">{totalItems}</span> item
            {totalItems === 1 ? "" : "s"} · $
            {totalPrecio.toLocaleString("es-CO")}
          </div>
          <button
            type="button"
            onClick={() => setRevisando(true)}
            className={buttonPrimaryClass}
          >
            Revisar pedido
          </button>
        </div>
      )}
    </div>
  );
}
