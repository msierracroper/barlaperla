"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inputClass, buttonPrimaryClass } from "@/components/ui/form-controls";
import type { PresetRango, ReportesData } from "@/lib/reportes";

const TABS = [
  "Ventas",
  "Productos",
  "Meseros",
  "Mesas",
  "Utilidades",
  "Fiados",
  "Gastos",
  "Anulaciones",
  "Cierres",
] as const;
type Tab = (typeof TABS)[number];

const PRESETS: { value: PresetRango; label: string }[] = [
  { value: "hoy", label: "Hoy" },
  { value: "semana", label: "Esta semana" },
  { value: "mes", label: "Este mes" },
  { value: "personalizado", label: "Rango personalizado" },
];

function fmt(n: number) {
  return `$${n.toLocaleString("es-CO")}`;
}

export function ReportesView({
  preset,
  desde,
  hasta,
  datos,
}: {
  preset: PresetRango;
  desde: string;
  hasta: string;
  datos: ReportesData;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("Ventas");
  const [desdeStr, setDesdeStr] = useState(desde);
  const [hastaStr, setHastaStr] = useState(hasta);

  function irAPreset(p: PresetRango) {
    router.push(`/admin/reportes?preset=${p}`);
  }

  function aplicarPersonalizado() {
    router.push(`/admin/reportes?preset=personalizado&desde=${desdeStr}&hasta=${hastaStr}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-perla-dorado">Reportes</h2>
        <p className="text-xs text-white/50">
          {desde === hasta ? desde : `${desde} → ${hasta}`}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        {PRESETS.filter((p) => p.value !== "personalizado").map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => irAPreset(p.value)}
            className={`rounded-md px-3 py-1.5 text-sm transition ${
              preset === p.value
                ? "bg-perla-dorado font-semibold text-perla-azul-deep"
                : "bg-white/5 text-white/70 hover:bg-white/10"
            }`}
          >
            {p.label}
          </button>
        ))}
        <div className="flex items-end gap-2">
          <input
            type="date"
            value={desdeStr}
            onChange={(e) => setDesdeStr(e.target.value)}
            className={`${inputClass} w-40`}
          />
          <input
            type="date"
            value={hastaStr}
            onChange={(e) => setHastaStr(e.target.value)}
            className={`${inputClass} w-40`}
          />
          <button
            type="button"
            onClick={aplicarPersonalizado}
            className={
              preset === "personalizado" ? buttonPrimaryClass : "rounded-md bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10"
            }
          >
            Aplicar rango
          </button>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`shrink-0 rounded-md px-3 py-1.5 text-sm transition ${
              tab === t
                ? "bg-perla-dorado font-semibold text-perla-azul-deep"
                : "bg-white/5 text-white/70 hover:bg-white/10"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Ventas" && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Kpi label="Efectivo" valor={fmt(datos.totalPeriodo.efectivo)} />
            <Kpi label="Transferencia" valor={fmt(datos.totalPeriodo.transferencia)} />
            <Kpi label="Fiado" valor={fmt(datos.totalPeriodo.fiado)} />
            <Kpi label="Gastos" valor={fmt(datos.totalPeriodo.gastos)} />
            <Kpi label="Total vendido" valor={fmt(datos.totalPeriodo.total)} />
          </div>
          <Tabla
            columnas={["Fecha", "Efectivo", "Transferencia", "Fiado", "Gastos", "Total"]}
            filas={datos.ventasPorDia.map((v) => [
              v.fecha,
              fmt(v.resumen.efectivo),
              fmt(v.resumen.transferencia),
              fmt(v.resumen.fiado),
              fmt(v.resumen.gastos),
              fmt(v.resumen.total),
            ])}
            vacio="No hay ventas en este período."
          />
        </div>
      )}

      {tab === "Productos" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/50">
              Más vendidos
            </h3>
            <Tabla
              columnas={["Producto", "Cantidad", "Total"]}
              filas={datos.productosTop.map((p) => [p.nombre, String(p.cantidad), fmt(p.total)])}
              vacio="Sin ventas en este período."
            />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/50">
              Menos vendidos
            </h3>
            <Tabla
              columnas={["Producto", "Cantidad", "Total"]}
              filas={datos.productosMenos.map((p) => [p.nombre, String(p.cantidad), fmt(p.total)])}
              vacio="Sin ventas en este período."
            />
          </div>
        </div>
      )}

      {tab === "Meseros" && (
        <Tabla
          columnas={["Mesera", "Cuentas", "Total vendido"]}
          filas={datos.ventasPorMesero.map((m) => [m.nombre, String(m.cuentas), fmt(m.total)])}
          vacio="No hay ventas en este período."
        />
      )}

      {tab === "Mesas" && (
        <Tabla
          columnas={["Mesa / silla", "Total vendido"]}
          filas={datos.ventasPorUbicacion.map((u) => [u.etiqueta, fmt(u.total)])}
          vacio="No hay ventas en este período."
        />
      )}

      {tab === "Utilidades" && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Kpi label="Venta total" valor={fmt(datos.totalPeriodo.total)} />
          <Kpi label="Costo estimado" valor={fmt(datos.costoTotal)} />
          <Kpi label="Gastos" valor={fmt(datos.totalPeriodo.gastos)} />
          <Kpi label="Utilidad estimada" valor={fmt(datos.utilidadEstimada)} nota="Venta - costo - gastos" />
        </div>
      )}

      {tab === "Fiados" && (
        <Tabla
          columnas={["Cliente", "Teléfono", "Saldo pendiente"]}
          filas={datos.fiadosPendientes.map((f) => [f.cliente, f.telefono ?? "—", fmt(f.saldo)])}
          vacio="No hay fiados pendientes."
        />
      )}

      {tab === "Gastos" && (
        <Tabla
          columnas={["Categoría", "Total"]}
          filas={datos.gastosPorCategoria.map((g) => [g.nombre, fmt(g.total)])}
          vacio="No hay gastos en este período."
        />
      )}

      {tab === "Anulaciones" && (
        <Tabla
          columnas={["Fecha", "Producto", "Cantidad", "Motivo", "Anulado por"]}
          filas={datos.anulaciones.map((a) => [
            new Date(a.fecha).toLocaleString("es-CO"),
            a.producto,
            String(a.cantidad),
            a.motivo ?? "—",
            a.anuladoPor,
          ])}
          vacio="No hay anulaciones en este período."
        />
      )}

      {tab === "Cierres" && (
        <Tabla
          columnas={["Fecha", "Base inicial", "Efectivo contado", "Diferencia", "Cerrado por"]}
          filas={datos.historicoCierres.map((c) => [
            c.fecha,
            fmt(c.baseCajaInicial),
            c.efectivoContado !== null ? fmt(c.efectivoContado) : "—",
            c.diferenciaCaja !== null ? fmt(c.diferenciaCaja) : "—",
            c.cerradoPor ?? "—",
          ])}
          vacio="No hay jornadas cerradas en este período."
        />
      )}
    </div>
  );
}

function Kpi({ label, valor, nota }: { label: string; valor: string; nota?: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-perla-azul p-3 sm:p-4">
      <p className="text-xs text-white/60">{label}</p>
      <p className="mt-1 text-lg font-bold text-perla-dorado sm:text-xl">{valor}</p>
      {nota && <p className="mt-1 text-[11px] text-white/40">{nota}</p>}
    </div>
  );
}

function Tabla({
  columnas,
  filas,
  vacio,
}: {
  columnas: string[];
  filas: string[][];
  vacio: string;
}) {
  if (!filas.length) {
    return <p className="text-sm text-white/50">{vacio}</p>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full text-sm">
        <thead className="bg-perla-azul text-white/70">
          <tr>
            {columnas.map((c) => (
              <th key={c} className="px-4 py-2 text-left">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila, i) => (
            <tr key={i} className="border-t border-white/10 bg-perla-azul/60">
              {fila.map((valor, j) => (
                <td key={j} className="px-4 py-2 text-white/80">
                  {valor}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
