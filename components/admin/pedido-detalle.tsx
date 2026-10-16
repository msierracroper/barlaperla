"use client";

import { useMemo, useTransition } from "react";
import { useRealtimePedidoItems } from "@/hooks/useRealtimePedidoItems";
import { marcarEntregado } from "@/app/mesera/cuentas/[cuentaId]/actions";
import { calcularTotalItem } from "@/lib/precio";
import { etiquetaPedidoItem } from "@/lib/etiquetas";
import { Card } from "@/components/ui/card";
import { buttonSecondaryClass } from "@/components/ui/form-controls";
import { MarcarListoBoton } from "@/components/admin/marcar-listo-boton";
import { AnularItemBoton } from "@/components/caja/anular-item-boton";
import { CancelarCuentaBoton } from "@/components/caja/cancelar-cuenta-boton";
import { MenuSelector } from "@/components/mesera/menu-selector";
import type { CuentaEstado, Database } from "@/types/database.types";

type PedidoItemRow = Database["public"]["Tables"]["pedido_items"]["Row"];

interface Subcuenta {
  id: string;
  nombre_cliente: string;
}

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

const ETIQUETA_ESTADO: Record<
  PedidoItemRow["estado"],
  { texto: string; clase: string }
> = {
  pendiente: { texto: "Pendiente", clase: "text-white/50" },
  listo: { texto: "Listo · entregar", clase: "text-perla-verde-claro" },
  entregado: { texto: "Entregado", clase: "text-white/30" },
  anulado: { texto: "Anulado", clase: "text-red-400" },
};

export function PedidoDetalle({
  cuentaId,
  etiqueta,
  estadoCuenta,
  subcuentas,
  itemsIniciales,
  productos,
  categorias,
}: {
  cuentaId: string;
  etiqueta: string;
  estadoCuenta: CuentaEstado;
  subcuentas: Subcuenta[];
  itemsIniciales: PedidoItemRow[];
  productos: Producto[];
  categorias: Categoria[];
}) {
  const items = useRealtimePedidoItems(itemsIniciales);
  const [, startTransition] = useTransition();

  const itemsPorSubcuenta = useMemo(() => {
    const mapa = new Map<string, PedidoItemRow[]>();
    for (const item of items) {
      const lista = mapa.get(item.subcuenta_id) ?? [];
      lista.push(item);
      mapa.set(item.subcuenta_id, lista);
    }
    return mapa;
  }, [items]);

  const nombrePorProducto = new Map(productos.map((p) => [p.id, p.nombre]));
  const abierta = estadoCuenta === "abierta";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-xl text-perla-dorado">{etiqueta}</h2>
        <p className="text-xs text-white/50">Estado: {estadoCuenta}</p>
      </div>

      {subcuentas.map((subcuenta) => {
        const itemsSubcuenta = (itemsPorSubcuenta.get(subcuenta.id) ?? []).sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        const activos = itemsSubcuenta.filter((i) => !i.anulado);
        const total = activos.reduce((acc, i) => acc + calcularTotalItem(i), 0);
        const hayPendientes = activos.some((i) => i.estado === "pendiente");

        return (
          <Card key={subcuenta.id}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">
                {subcuenta.nombre_cliente}
              </h3>
              {hayPendientes && <MarcarListoBoton subcuentaId={subcuenta.id} />}
            </div>

            <div className="mt-3 flex flex-col gap-1.5 text-sm">
              {itemsSubcuenta.map((item) => {
                const estado = ETIQUETA_ESTADO[item.estado];
                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between ${
                      item.anulado ? "text-white/30 line-through" : "text-white/70"
                    }`}
                  >
                    <span>
                      {item.cantidad}x{" "}
                      {etiquetaPedidoItem(item, nombrePorProducto, new Map())}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className={item.anulado ? "" : estado.clase}>
                        {item.anulado ? "Anulado" : estado.texto}
                      </span>
                      <span>${calcularTotalItem(item).toLocaleString("es-CO")}</span>
                      {!item.anulado && item.estado === "listo" && (
                        <button
                          type="button"
                          onClick={() =>
                            startTransition(async () => {
                              await marcarEntregado(cuentaId, item.id);
                            })
                          }
                          className={buttonSecondaryClass}
                        >
                          Entregado
                        </button>
                      )}
                      {!item.anulado && (
                        <AnularItemBoton cuentaId={cuentaId} itemId={item.id} />
                      )}
                    </div>
                  </div>
                );
              })}
              {!itemsSubcuenta.length && (
                <p className="text-white/40">Sin items.</p>
              )}
            </div>

            <div className="mt-3 flex justify-between border-t border-white/10 pt-3 font-display text-lg text-perla-dorado">
              <span>Total</span>
              <span>${total.toLocaleString("es-CO")}</span>
            </div>

            {abierta && (
              <details className="mt-4 border-t border-white/10 pt-4">
                <summary className="cursor-pointer text-sm text-white/60 hover:text-white">
                  + Agregar productos
                </summary>
                <div className="mt-3">
                  <MenuSelector
                    key={subcuenta.id}
                    cuentaId={cuentaId}
                    subcuentaId={subcuenta.id}
                    categorias={categorias}
                    productos={productos}
                  />
                </div>
              </details>
            )}
          </Card>
        );
      })}

      {abierta && <CancelarCuentaBoton cuentaId={cuentaId} />}
    </div>
  );
}
