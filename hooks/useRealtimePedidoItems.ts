"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

type PedidoItemRow = Database["public"]["Tables"]["pedido_items"]["Row"];

/**
 * Mantiene una lista de pedido_items sincronizada en vivo con Supabase
 * Realtime. Si se pasa `filtro`, se suscribe solo a esa columna=valor
 * (ej. subcuenta_id, para la vista de la mesera); si se omite, se suscribe
 * a toda la tabla y el filtrado queda del lado del consumidor (ej. el
 * preparador, que necesita ver tanto altas de "pendiente" como bajas hacia
 * "listo" sin que el filtro de Realtime se lo pierda).
 */
export function useRealtimePedidoItems(
  itemsIniciales: PedidoItemRow[],
  filtro?: { column: string; value: string }
) {
  // itemsIniciales cambia cuando el Server Component padre se revalida
  // (ej. la mesera agrega un producto). Se sincroniza ajustando el estado
  // durante el render en vez de con un efecto, siguiendo el patron oficial
  // de React para "adjusting state when a prop changes".
  const firmaIniciales = itemsIniciales.map((i) => i.id).join(",");
  const [items, setItems] = useState(itemsIniciales);
  const [firmaSincronizada, setFirmaSincronizada] = useState(firmaIniciales);

  if (firmaIniciales !== firmaSincronizada) {
    setFirmaSincronizada(firmaIniciales);
    setItems(itemsIniciales);
  }

  useEffect(() => {
    const supabase = createClient();
    const nombreCanal = filtro
      ? `pedido_items:${filtro.column}:${filtro.value}`
      : "pedido_items:todos";

    const canal = supabase
      .channel(nombreCanal)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pedido_items",
          ...(filtro ? { filter: `${filtro.column}=eq.${filtro.value}` } : {}),
        },
        (payload) => {
          setItems((actuales) => {
            if (payload.eventType === "DELETE") {
              const eliminado = payload.old as { id: string };
              return actuales.filter((item) => item.id !== eliminado.id);
            }

            const nuevo = payload.new as PedidoItemRow;
            const existe = actuales.some((item) => item.id === nuevo.id);
            return existe
              ? actuales.map((item) => (item.id === nuevo.id ? nuevo : item))
              : [...actuales, nuevo];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
    // Se depende de los campos primitivos de `filtro`, no del objeto, porque
    // los llamadores suelen pasar un literal inline nuevo en cada render y
    // eso resuscribiria el canal de Realtime sin necesidad.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro?.column, filtro?.value]);

  return items;
}
