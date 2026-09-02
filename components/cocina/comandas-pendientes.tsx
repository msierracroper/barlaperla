"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRealtimePedidoItems } from "@/hooks/useRealtimePedidoItems";
import { marcarListoPorSubcuenta } from "@/app/cocina/actions";
import { buttonPrimaryClass } from "@/components/ui/form-controls";
import type { Database } from "@/types/database.types";

type PedidoItemRow = Database["public"]["Tables"]["pedido_items"]["Row"];

function formatearTranscurrido(fechaIso: string): string {
  const minutos = Math.max(
    0,
    Math.floor((Date.now() - new Date(fechaIso).getTime()) / 60000)
  );
  if (minutos < 1) return "Recién";
  if (minutos === 1) return "Hace 1 min";
  if (minutos < 60) return `Hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  return `Hace ${horas} h`;
}

interface Comanda {
  subcuentaId: string;
  etiqueta: string;
  items: PedidoItemRow[];
  masAntiguo: string;
  hayPendientes: boolean;
}

export function ComandasPendientes({
  itemsIniciales,
  productos,
  etiquetaPorSubcuenta,
}: {
  itemsIniciales: PedidoItemRow[];
  productos: { id: string; nombre: string }[];
  etiquetaPorSubcuenta: Record<string, string>;
}) {
  const items = useRealtimePedidoItems(itemsIniciales);
  const nombrePorProducto = new Map(productos.map((p) => [p.id, p.nombre]));

  const [, forzarTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forzarTick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const comandas = useMemo(() => {
    const porSubcuenta = new Map<string, PedidoItemRow[]>();
    for (const item of items) {
      if (item.estado !== "pendiente" && item.estado !== "listo") continue;
      const lista = porSubcuenta.get(item.subcuenta_id) ?? [];
      lista.push(item);
      porSubcuenta.set(item.subcuenta_id, lista);
    }

    const resultado: Comanda[] = [];
    for (const [subcuentaId, lista] of porSubcuenta) {
      const ordenados = [...lista].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      resultado.push({
        subcuentaId,
        etiqueta: etiquetaPorSubcuenta[subcuentaId] ?? "Cuenta",
        items: ordenados,
        masAntiguo: ordenados[0]?.created_at ?? new Date().toISOString(),
        hayPendientes: ordenados.some((i) => i.estado === "pendiente"),
      });
    }

    return resultado.sort(
      (a, b) => new Date(a.masAntiguo).getTime() - new Date(b.masAntiguo).getTime()
    );
  }, [items, etiquetaPorSubcuenta]);

  const pendientes = comandas.filter((c) => c.hayPendientes);
  const listas = comandas.filter((c) => !c.hayPendientes);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/50">
          Comandas pendientes
        </h2>
        {pendientes.length ? (
          <div className="flex flex-col gap-3">
            {pendientes.map((comanda) => (
              <TarjetaComanda
                key={comanda.subcuentaId}
                comanda={comanda}
                nombrePorProducto={nombrePorProducto}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/50">
            No hay pedidos pendientes por preparar.
          </p>
        )}
      </div>

      {listas.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/50">
            Listas recientemente
          </h2>
          <div className="flex flex-col gap-2">
            {listas.map((comanda) => (
              <div
                key={comanda.subcuentaId}
                className="rounded-lg border border-white/5 bg-perla-azul/40 p-3 opacity-60"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-white/70">
                    {comanda.etiqueta}
                  </p>
                  <span className="text-xs text-perla-verde-claro">
                    ✓ Listo
                  </span>
                </div>
                <p className="mt-1 text-xs text-white/40">
                  {comanda.items
                    .map(
                      (i) => `${i.cantidad}x ${nombrePorProducto.get(i.producto_id) ?? "Producto"}`
                    )
                    .join(" · ")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TarjetaComanda({
  comanda,
  nombrePorProducto,
}: {
  comanda: Comanda;
  nombrePorProducto: Map<string, string>;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-lg border border-white/10 bg-perla-azul p-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-white">{comanda.etiqueta}</p>
        <span className="text-xs text-white/40">
          {formatearTranscurrido(comanda.masAntiguo)}
        </span>
      </div>
      <p className="mt-1 text-sm text-white/70">
        {comanda.items
          .map(
            (i) => `${i.cantidad}x ${nombrePorProducto.get(i.producto_id) ?? "Producto"}`
          )
          .join(" · ")}
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await marcarListoPorSubcuenta(comanda.subcuentaId);
          })
        }
        className={`${buttonPrimaryClass} mt-3 w-full`}
      >
        {pending ? "Marcando..." : "Marcar listo"}
      </button>
    </div>
  );
}
