"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { crearCuentaConPedido } from "@/app/mesera/nuevo/actions";
import { buttonPrimaryClass } from "@/components/ui/form-controls";
import type { CuentaTipo } from "@/types/database.types";

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

interface Linea {
  productoId: string;
  cantidad: number;
  subcuenta: string;
}

function lineKey(productoId: string, subcuenta: string): string {
  return `${productoId}::${subcuenta}`;
}

export function NuevoPedido({
  tipo,
  ubicacionId,
  etiqueta,
  productos,
  categorias,
}: {
  tipo: CuentaTipo;
  ubicacionId: string;
  etiqueta: string;
  productos: Producto[];
  categorias: Categoria[];
}) {
  const router = useRouter();
  const [tabActiva, setTabActiva] = useState(categorias[0]?.id ?? "");
  const [subcuentas, setSubcuentas] = useState(["Cuenta 1"]);
  const [subcuentaActiva, setSubcuentaActiva] = useState("Cuenta 1");
  const [lines, setLines] = useState<Record<string, Linea>>({});
  const [paso, setPaso] = useState<"items" | "resumen">("items");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const productoPorId = useMemo(
    () => new Map(productos.map((p) => [p.id, p])),
    [productos]
  );

  const productosVisibles = useMemo(
    () => productos.filter((p) => p.categoria_id === tabActiva),
    [productos, tabActiva]
  );

  function cantidadDe(productoId: string): number {
    return lines[lineKey(productoId, subcuentaActiva)]?.cantidad ?? 0;
  }

  function ajustar(productoId: string, delta: number) {
    const key = lineKey(productoId, subcuentaActiva);
    setLines((actual) => {
      const nueva = Math.max(0, (actual[key]?.cantidad ?? 0) + delta);
      if (nueva === 0) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [key]: _quitado, ...resto } = actual;
        return resto;
      }
      return {
        ...actual,
        [key]: { productoId, cantidad: nueva, subcuenta: subcuentaActiva },
      };
    });
  }

  function agregarSubcuenta() {
    const siguiente = `Cuenta ${subcuentas.length + 1}`;
    setSubcuentas((actual) => [...actual, siguiente]);
    setSubcuentaActiva(siguiente);
  }

  const lineasConProducto = useMemo(
    () =>
      Object.values(lines)
        .map((l) => ({ ...l, producto: productoPorId.get(l.productoId) }))
        .filter(
          (l): l is Linea & { producto: Producto } => l.producto !== undefined
        ),
    [lines, productoPorId]
  );

  const totalItems = lineasConProducto.reduce((a, l) => a + l.cantidad, 0);
  const totalPrecio = lineasConProducto.reduce(
    (a, l) => a + l.cantidad * l.producto.precio_venta,
    0
  );
  const dividido = subcuentas.length > 1;

  function subtotalDe(subcuenta: string): number {
    return lineasConProducto
      .filter((l) => l.subcuenta === subcuenta)
      .reduce((a, l) => a + l.cantidad * l.producto.precio_venta, 0);
  }

  function confirmarPedido() {
    setError(null);
    startTransition(async () => {
      try {
        const cuentaId = await crearCuentaConPedido({
          tipo,
          ubicacionId,
          subcuentas,
          items: lineasConProducto.map((l) => ({
            productoId: l.productoId,
            cantidad: l.cantidad,
            subcuenta: l.subcuenta,
          })),
        });
        router.push(`/mesera/cuentas/${cuentaId}`);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "No se pudo enviar el pedido."
        );
      }
    });
  }

  if (paso === "resumen") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPaso("items")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="Volver"
          >
            ←
          </button>
          <div className="text-center">
            <p className="text-xs uppercase tracking-wide text-white/40">
              Resumen
            </p>
            <h2 className="text-lg font-semibold text-perla-dorado">
              {etiqueta} · {totalItems} items
            </h2>
          </div>
          <div className="w-9" />
        </div>

        <div className="rounded-lg border border-white/10 bg-perla-azul p-4">
          {subcuentas.map((subcuenta) => {
            const lineasSub = lineasConProducto.filter(
              (l) => l.subcuenta === subcuenta
            );
            if (!lineasSub.length) return null;
            return (
              <div key={subcuenta}>
                {dividido && (
                  <div className="flex justify-between border-b border-white/10 pb-1 pt-2 text-sm font-semibold text-perla-dorado">
                    <span>{subcuenta}</span>
                    <span>${subtotalDe(subcuenta).toLocaleString("es-CO")}</span>
                  </div>
                )}
                {lineasSub.map((l) => (
                  <div
                    key={lineKey(l.productoId, l.subcuenta)}
                    className="flex justify-between py-1.5 text-sm text-white/80"
                  >
                    <span>
                      {l.cantidad}x {l.producto.nombre}
                    </span>
                    <span>
                      ${(l.cantidad * l.producto.precio_venta).toLocaleString("es-CO")}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
          <div className="mt-2 flex justify-between border-t border-white/10 pt-3 text-lg font-bold text-perla-dorado">
            <span>Total</span>
            <span>${totalPrecio.toLocaleString("es-CO")}</span>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={confirmarPedido}
          disabled={pending}
          className={buttonPrimaryClass}
        >
          {pending ? "Enviando..." : "Enviar a preparación"}
        </button>
        <button
          type="button"
          onClick={() => setPaso("items")}
          disabled={pending}
          className="text-center text-sm text-white/60 hover:text-white"
        >
          ← Editar pedido
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push("/mesera")}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
          aria-label="Volver"
        >
          ←
        </button>
        <div className="text-center">
          <p className="text-xs uppercase tracking-wide text-white/40">
            Nuevo pedido
          </p>
          <h2 className="text-lg font-semibold text-perla-dorado">{etiqueta}</h2>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
          {totalItems} items
        </span>
      </div>

      <div className="rounded-lg border border-white/10 bg-perla-azul p-3">
        <div className="flex flex-wrap items-center gap-1">
          {subcuentas.map((subcuenta) => (
            <button
              key={subcuenta}
              type="button"
              onClick={() => setSubcuentaActiva(subcuenta)}
              className={`shrink-0 rounded-md px-3 py-1.5 text-sm transition ${
                subcuentaActiva === subcuenta
                  ? "bg-perla-dorado font-semibold text-perla-azul-deep"
                  : "bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              {subcuenta}
            </button>
          ))}
          <button
            type="button"
            onClick={agregarSubcuenta}
            className="shrink-0 rounded-md border border-dashed border-white/20 px-3 py-1.5 text-sm text-white/60 hover:border-white/40 hover:text-white"
          >
            + Cuenta
          </button>
        </div>
        {dividido && (
          <p className="mt-2 text-xs text-perla-dorado">
            Los productos que agregues quedan en{" "}
            <strong>{subcuentaActiva}</strong>
          </p>
        )}
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
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
          const cantidad = cantidadDe(producto.id);
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
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-perla-rojo text-white transition hover:brightness-110 disabled:opacity-30"
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
        <div className="sticky bottom-3 flex items-center justify-between gap-3 rounded-lg border border-perla-dorado/40 bg-perla-azul-deep p-3 shadow-lg">
          <div className="text-sm text-white">
            <span className="font-semibold">{totalItems}</span> item
            {totalItems === 1 ? "" : "s"} · $
            {totalPrecio.toLocaleString("es-CO")}
          </div>
          <button
            type="button"
            onClick={() => setPaso("resumen")}
            className={buttonPrimaryClass}
          >
            Ver resumen
          </button>
        </div>
      )}
    </div>
  );
}
