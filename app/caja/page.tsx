import Link from "next/link";
import { requireRol } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { obtenerJornadaActiva } from "@/lib/jornada";
import { etiquetasPorCuenta } from "@/lib/ubicaciones";
import { calcularTotalItem } from "@/lib/precio";
import { calcularResumenCaja } from "@/lib/caja";
import { Card } from "@/components/ui/card";
import { inputClass, buttonPrimaryClass } from "@/components/ui/form-controls";
import { actualizarBaseCaja, cerrarJornada } from "./actions";

function Resumen({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="rounded-md bg-white/5 p-3">
      <p className="text-xs text-white/50">{label}</p>
      <p className="text-lg font-semibold text-white">
        ${valor.toLocaleString("es-CO")}
      </p>
    </div>
  );
}

export default async function CajaHomePage() {
  const usuario = await requireRol("cajero");

  if (!usuario.sedeId) {
    return <p className="text-white/70">Tu usuario no tiene una sede asignada.</p>;
  }

  const jornada = await obtenerJornadaActiva(usuario.sedeId);
  const supabase = await createClient();

  const { data: cuentasAbiertas } = await supabase
    .from("cuentas")
    .select("id, tipo, created_at")
    .eq("jornada_id", jornada.id)
    .eq("estado", "abierta")
    .order("created_at");

  const cuentaIds = (cuentasAbiertas ?? []).map((c) => c.id);

  const [etiquetas, { data: subcuentas }, resumen] = await Promise.all([
    etiquetasPorCuenta(cuentaIds),
    cuentaIds.length
      ? supabase.from("subcuentas").select("id, cuenta_id").in("cuenta_id", cuentaIds)
      : Promise.resolve({ data: [] as { id: string; cuenta_id: string }[] }),
    calcularResumenCaja(jornada.id),
  ]);

  const subcuentaPorCuenta = new Map(
    (subcuentas ?? []).map((s) => [s.cuenta_id, s.id])
  );
  const subcuentaIds = (subcuentas ?? []).map((s) => s.id);

  const { data: items } = subcuentaIds.length
    ? await supabase
        .from("pedido_items")
        .select("subcuenta_id, cantidad, precio_unitario, precio_modificador, anulado")
        .in("subcuenta_id", subcuentaIds)
    : { data: [] };

  const totalPorSubcuenta = new Map<string, number>();
  for (const item of items ?? []) {
    const actual = totalPorSubcuenta.get(item.subcuenta_id) ?? 0;
    totalPorSubcuenta.set(item.subcuenta_id, actual + calcularTotalItem(item));
  }

  const efectivoEsperado = jornada.base_caja_inicial + resumen.efectivo;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-perla-dorado">
              Jornada {jornada.fecha_operativa}
            </h2>
            <p className="text-xs text-white/50">Estado: {jornada.estado}</p>
          </div>
        </div>

        {jornada.estado === "abierta" && (
          <form
            action={actualizarBaseCaja.bind(null, jornada.id)}
            className="mt-4 flex flex-wrap items-end gap-2"
          >
            <label className="flex flex-col gap-1 text-sm text-white/70">
              Base de caja inicial
              <input
                name="base_caja_inicial"
                type="number"
                min="0"
                step="1"
                defaultValue={jornada.base_caja_inicial}
                className={`${inputClass} w-40`}
              />
            </label>
            <button type="submit" className={buttonPrimaryClass}>
              Guardar base
            </button>
          </form>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Resumen label="Efectivo" valor={resumen.efectivo} />
          <Resumen label="Transferencia" valor={resumen.transferencia} />
          <Resumen label="Fiado" valor={resumen.fiado} />
          <Resumen label="Total cobrado" valor={resumen.total} />
        </div>

        {jornada.estado === "abierta" ? (
          <form
            action={cerrarJornada.bind(null, jornada.id)}
            className="mt-4 flex flex-wrap items-end gap-2 border-t border-white/10 pt-4"
          >
            <label className="flex flex-col gap-1 text-sm text-white/70">
              Efectivo contado (arqueo)
              <input
                name="efectivo_contado"
                type="number"
                min="0"
                step="1"
                required
                className={`${inputClass} w-40`}
              />
            </label>
            <p className="text-xs text-white/50">
              Esperado: ${efectivoEsperado.toLocaleString("es-CO")}
            </p>
            <button type="submit" className={buttonPrimaryClass}>
              Cerrar jornada
            </button>
          </form>
        ) : (
          <p className="mt-4 border-t border-white/10 pt-4 text-sm text-white/60">
            Jornada cerrada. Diferencia de caja: $
            {(jornada.diferencia_caja ?? 0).toLocaleString("es-CO")}
          </p>
        )}
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/50">
          Cuentas abiertas
        </h2>
        {cuentasAbiertas?.length ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cuentasAbiertas.map((cuenta) => {
              const subcuentaId = subcuentaPorCuenta.get(cuenta.id);
              const total = subcuentaId
                ? totalPorSubcuenta.get(subcuentaId) ?? 0
                : 0;
              return (
                <Card key={cuenta.id}>
                  <p className="font-semibold text-white">
                    {etiquetas.get(cuenta.id) ?? "Cuenta"}
                  </p>
                  <p className="text-xs text-white/50">
                    {cuenta.tipo === "mesa" ? "Mesa" : "Barra"}
                  </p>
                  <p className="mt-2 text-xl font-bold text-perla-dorado">
                    ${total.toLocaleString("es-CO")}
                  </p>
                  <Link
                    href={`/caja/cuentas/${cuenta.id}`}
                    className={`${buttonPrimaryClass} mt-3 block text-center`}
                  >
                    Cobrar
                  </Link>
                </Card>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-white/50">
            No hay cuentas abiertas por ahora.
          </p>
        )}
      </div>
    </div>
  );
}
