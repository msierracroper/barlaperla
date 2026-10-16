"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRealtimePedidoItems } from "@/hooks/useRealtimePedidoItems";
import { crearSubcuenta } from "@/app/mesera/cuentas/[cuentaId]/actions";
import { calcularTotalItem } from "@/lib/precio";
import { Card } from "@/components/ui/card";
import { MenuSelector } from "@/components/mesera/menu-selector";
import { PedidoItemsList } from "@/components/mesera/pedido-items-list";
import { CambiarUbicacionBoton } from "@/components/mesera/cambiar-ubicacion-boton";
import type { CuentaTipo, Database } from "@/types/database.types";

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

export function CuentaDetalle({
  cuentaId,
  tipo,
  etiquetaUbicacion,
  subcuentasIniciales,
  itemsIniciales,
  productos,
  categorias,
  ubicacionesLibres,
}: {
  cuentaId: string;
  tipo: CuentaTipo;
  etiquetaUbicacion: string;
  subcuentasIniciales: Subcuenta[];
  itemsIniciales: PedidoItemRow[];
  productos: Producto[];
  categorias: Categoria[];
  ubicacionesLibres: { id: string; etiqueta: string }[];
}) {
  const [subcuentas, setSubcuentas] = useState(subcuentasIniciales);
  const [subcuentaActivaId, setSubcuentaActivaId] = useState(
    subcuentasIniciales[0]?.id ?? ""
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const todosLosItems = useRealtimePedidoItems(itemsIniciales);
  const idsSubcuentas = useMemo(
    () => new Set(subcuentas.map((s) => s.id)),
    [subcuentas]
  );
  const items = useMemo(
    () => todosLosItems.filter((i) => idsSubcuentas.has(i.subcuenta_id)),
    [todosLosItems, idsSubcuentas]
  );

  const totalPorSubcuenta = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const item of items) {
      mapa.set(
        item.subcuenta_id,
        (mapa.get(item.subcuenta_id) ?? 0) + calcularTotalItem(item)
      );
    }
    return mapa;
  }, [items]);

  const totalGeneral = items.reduce((acc, i) => acc + calcularTotalItem(i), 0);
  const itemsSubcuentaActiva = items.filter(
    (i) => i.subcuenta_id === subcuentaActivaId
  );

  function agregarCuenta() {
    setError(null);
    startTransition(async () => {
      try {
        const nueva = await crearSubcuenta(cuentaId);
        setSubcuentas((actual) => [...actual, nueva]);
        setSubcuentaActivaId(nueva.id);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "No se pudo agregar la cuenta."
        );
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link
          href="/mesera"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
          aria-label="Volver"
        >
          ←
        </Link>
        <div className="text-center">
          <p className="text-xs uppercase tracking-wide text-white/40">
            Nuevo pedido
          </p>
          <h2 className="font-display text-lg text-perla-dorado">
            {etiquetaUbicacion}
          </h2>
        </div>
        <p className="font-display text-lg text-perla-dorado">
          ${totalGeneral.toLocaleString("es-CO")}
        </p>
      </div>

      <CambiarUbicacionBoton
        cuentaId={cuentaId}
        tipo={tipo}
        libres={ubicacionesLibres}
      />

      <Card>
        <div className="flex flex-wrap items-center gap-1">
          {subcuentas.map((subcuenta) => (
            <button
              key={subcuenta.id}
              type="button"
              onClick={() => setSubcuentaActivaId(subcuenta.id)}
              className={`shrink-0 rounded-md px-3 py-1.5 text-sm transition ${
                subcuentaActivaId === subcuenta.id
                  ? "bg-perla-dorado font-semibold text-perla-azul-deep"
                  : "bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              {subcuenta.nombre_cliente}
              <span className="ml-1.5 opacity-70">
                ${(totalPorSubcuenta.get(subcuenta.id) ?? 0).toLocaleString("es-CO")}
              </span>
            </button>
          ))}

          <button
            type="button"
            onClick={agregarCuenta}
            disabled={pending}
            className="shrink-0 rounded-md border border-dashed border-white/20 px-3 py-1.5 text-sm text-white/60 transition hover:border-white/40 hover:text-white disabled:opacity-50"
          >
            {pending ? "..." : "+ Cuenta"}
          </button>
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
      </Card>

      {subcuentaActivaId && (
        <>
          <Card>
            <MenuSelector
              key={subcuentaActivaId}
              cuentaId={cuentaId}
              subcuentaId={subcuentaActivaId}
              categorias={categorias}
              productos={productos}
            />
          </Card>

          <PedidoItemsList
            cuentaId={cuentaId}
            items={itemsSubcuentaActiva}
            productos={productos}
          />
        </>
      )}
    </div>
  );
}
