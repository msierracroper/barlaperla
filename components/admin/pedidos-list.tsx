"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CuentaEstado } from "@/types/database.types";

interface Pedido {
  id: string;
  etiqueta: string;
  mesera: string;
  estado: CuentaEstado;
  total: number;
  createdAt: string;
}

const TABS: { value: "todos" | CuentaEstado; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "abierta", label: "Abiertas" },
  { value: "cerrada", label: "Cerradas" },
  { value: "anulada", label: "Anuladas" },
];

const ETIQUETA_ESTADO: Record<CuentaEstado, { texto: string; clase: string }> = {
  abierta: { texto: "Abierta", clase: "text-perla-verde-claro" },
  lista_para_cobrar: { texto: "Lista para cobrar", clase: "text-perla-dorado" },
  cerrada: { texto: "Cerrada", clase: "text-white/50" },
  anulada: { texto: "Anulada", clase: "text-red-400" },
};

function formatearHora(fechaIso: string): string {
  return new Date(fechaIso).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PedidosList({ pedidos }: { pedidos: Pedido[] }) {
  const [tabActiva, setTabActiva] = useState<"todos" | CuentaEstado>("todos");

  const visibles = useMemo(
    () =>
      tabActiva === "todos"
        ? pedidos
        : pedidos.filter((p) => p.estado === tabActiva),
    [pedidos, tabActiva]
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold text-perla-dorado">
          Control de pedidos
        </h2>
        <p className="text-xs text-white/50">{pedidos.length} pedidos hoy</p>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setTabActiva(tab.value)}
            className={`shrink-0 rounded-md px-3 py-1.5 text-sm transition ${
              tabActiva === tab.value
                ? "bg-perla-dorado font-semibold text-perla-azul-deep"
                : "bg-white/5 text-white/70 hover:bg-white/10"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visibles.map((pedido) => {
          const estado = ETIQUETA_ESTADO[pedido.estado];
          return (
            <Link
              key={pedido.id}
              href={`/admin/pedidos/${pedido.id}`}
              className="rounded-lg border border-white/10 bg-perla-azul p-4 transition hover:border-perla-dorado/40"
            >
              <div className="flex items-start justify-between">
                <p className="font-semibold text-white">{pedido.etiqueta}</p>
                <span className={`text-xs ${estado.clase}`}>{estado.texto}</span>
              </div>
              <p className="mt-1 text-xs text-white/50">
                {formatearHora(pedido.createdAt)} · {pedido.mesera}
              </p>
              <p className="mt-2 text-lg font-bold text-perla-dorado">
                ${pedido.total.toLocaleString("es-CO")}
              </p>
            </Link>
          );
        })}
        {!visibles.length && (
          <p className="col-span-full py-6 text-center text-sm text-white/50">
            No hay pedidos en este filtro.
          </p>
        )}
      </div>
    </div>
  );
}
