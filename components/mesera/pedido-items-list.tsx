"use client";

import { useRealtimePedidoItems } from "@/hooks/useRealtimePedidoItems";
import { marcarEntregado } from "@/app/mesera/cuentas/[cuentaId]/actions";
import { linkButtonClass } from "@/components/ui/form-controls";
import { calcularTotalItem } from "@/lib/precio";
import { etiquetaPedidoItem } from "@/lib/etiquetas";
import type { Database } from "@/types/database.types";

type PedidoItemRow = Database["public"]["Tables"]["pedido_items"]["Row"];

const ETIQUETA_ESTADO: Record<
  PedidoItemRow["estado"],
  { texto: string; clase: string }
> = {
  pendiente: { texto: "Pendiente", clase: "text-white/50" },
  listo: { texto: "Listo · entregar", clase: "text-perla-verde-claro" },
  entregado: { texto: "Entregado", clase: "text-white/30" },
  anulado: { texto: "Anulado", clase: "text-red-400" },
};

export function PedidoItemsList({
  cuentaId,
  subcuentaId,
  itemsIniciales,
  productos,
  modificadores = [],
}: {
  cuentaId: string;
  subcuentaId: string;
  itemsIniciales: PedidoItemRow[];
  productos: { id: string; nombre: string }[];
  modificadores?: { id: string; nombre: string }[];
}) {
  const items = useRealtimePedidoItems(itemsIniciales, {
    column: "subcuenta_id",
    value: subcuentaId,
  });

  const nombrePorProducto = new Map(productos.map((p) => [p.id, p.nombre]));
  const nombrePorModificador = new Map(modificadores.map((m) => [m.id, m.nombre]));

  const ordenados = [...items].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full text-sm">
        <thead className="bg-perla-azul text-white/70">
          <tr>
            <th className="px-4 py-2 text-left">Producto</th>
            <th className="px-4 py-2 text-right">Cant.</th>
            <th className="px-4 py-2 text-right">Subtotal</th>
            <th className="px-4 py-2 text-left">Estado</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {ordenados.map((item) => {
            const estado = ETIQUETA_ESTADO[item.estado];
            const subtotal = calcularTotalItem(item);

            return (
              <tr
                key={item.id}
                className="border-t border-white/10 bg-perla-azul/60"
              >
                <td className="px-4 py-2">
                  {etiquetaPedidoItem(item, nombrePorProducto, nombrePorModificador)}
                </td>
                <td className="px-4 py-2 text-right">{item.cantidad}</td>
                <td className="px-4 py-2 text-right">
                  ${subtotal.toLocaleString("es-CO")}
                </td>
                <td className={`px-4 py-2 ${estado.clase}`}>{estado.texto}</td>
                <td className="px-4 py-2 text-right">
                  {item.estado === "listo" && (
                    <button
                      type="button"
                      onClick={() => marcarEntregado(cuentaId, item.id)}
                      className={linkButtonClass}
                    >
                      Marcar entregado
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
          {!ordenados.length && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-white/50">
                Todavía no hay pedidos en esta cuenta.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
