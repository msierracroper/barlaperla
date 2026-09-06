import { requireRol } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { obtenerJornadaActiva } from "@/lib/jornada";
import { Card } from "@/components/ui/card";
import { inputClass, buttonPrimaryClass, buttonSecondaryClass } from "@/components/ui/form-controls";
import { RegistrarGastoForm } from "@/components/caja/registrar-gasto-form";
import {
  crearCategoriaGasto,
  toggleCategoriaGastoActiva,
} from "./actions";

export default async function GastosPage() {
  const usuario = await requireRol("cajero");

  if (!usuario.sedeId) {
    return <p className="text-white/70">Tu usuario no tiene una sede asignada.</p>;
  }

  const jornada = await obtenerJornadaActiva(usuario.sedeId);
  const supabase = await createClient();

  const [{ data: categorias }, { data: gastos }] = await Promise.all([
    supabase
      .from("gastos_categorias")
      .select("id, nombre, activa")
      .eq("sede_id", usuario.sedeId)
      .order("nombre"),
    supabase
      .from("gastos")
      .select("id, categoria_id, monto, descripcion, created_at")
      .eq("jornada_id", jornada.id)
      .order("created_at", { ascending: false }),
  ]);

  const categoriasActivas = (categorias ?? []).filter((c) => c.activa);
  const nombrePorCategoria = new Map((categorias ?? []).map((c) => [c.id, c.nombre]));
  const totalHoy = (gastos ?? []).reduce((acc, g) => acc + g.monto, 0);
  const esAdmin = usuario.roles.includes("admin");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-perla-dorado">Gastos</h2>
        <p className="text-xs text-white/50">
          Jornada {jornada.fecha_operativa} · Total hoy: $
          {totalHoy.toLocaleString("es-CO")}
        </p>
      </div>

      <Card>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/50">
          Registrar gasto
        </h3>
        <RegistrarGastoForm jornadaId={jornada.id} categorias={categoriasActivas} />
      </Card>

      <div className="flex flex-col gap-2">
        {(gastos ?? []).map((g) => (
          <div
            key={g.id}
            className="flex items-center justify-between rounded-lg border border-white/10 bg-perla-azul p-3"
          >
            <div>
              <p className="text-sm text-white">
                {g.descripcion || nombrePorCategoria.get(g.categoria_id ?? "") || "Gasto"}
              </p>
              {g.descripcion && g.categoria_id && (
                <p className="text-xs text-white/50">
                  {nombrePorCategoria.get(g.categoria_id)}
                </p>
              )}
            </div>
            <span className="text-perla-dorado">${g.monto.toLocaleString("es-CO")}</span>
          </div>
        ))}
        {!gastos?.length && (
          <p className="text-sm text-white/50">No hay gastos registrados hoy.</p>
        )}
      </div>

      {esAdmin && (
        <Card>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/50">
            Categorías de gasto
          </h3>
          <form action={crearCategoriaGasto} className="flex flex-wrap gap-2">
            <input
              name="nombre"
              placeholder="Ej: Insumos"
              required
              className={`${inputClass} flex-1 min-w-40`}
            />
            <button type="submit" className={buttonPrimaryClass}>
              Agregar
            </button>
          </form>

          <div className="mt-3 flex flex-col gap-2">
            {(categorias ?? []).map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2"
              >
                <span className={c.activa ? "text-white" : "text-white/40"}>
                  {c.nombre}
                </span>
                <form
                  action={toggleCategoriaGastoActiva.bind(null, c.id, !c.activa)}
                >
                  <button type="submit" className={buttonSecondaryClass}>
                    {c.activa ? "Desactivar" : "Activar"}
                  </button>
                </form>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
