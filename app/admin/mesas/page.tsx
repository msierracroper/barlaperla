import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/auth/roles";
import { Card } from "@/components/ui/card";
import { inputClass, buttonPrimaryClass, buttonSecondaryClass } from "@/components/ui/form-controls";
import { crearMesa, toggleMesaActiva, actualizarMesa } from "./actions";

export default async function MesasPage() {
  const usuario = await requireRol("admin");
  const supabase = await createClient();

  const { data: mesas } = await supabase
    .from("mesas")
    .select("id, numero, activa")
    .eq("sede_id", usuario.sedeId ?? "")
    .order("numero");

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <h2 className="font-display text-xl text-perla-dorado">Mesas</h2>
        <form action={crearMesa} className="mt-4 flex flex-wrap gap-2">
          <input
            name="numero"
            placeholder="Ej: Mesa 6"
            required
            className={`${inputClass} flex-1 min-w-40`}
          />
          <button type="submit" className={buttonPrimaryClass}>
            Agregar
          </button>
        </form>
      </Card>

      <div className="overflow-hidden rounded-lg border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-perla-azul text-white/70">
            <tr>
              <th className="px-4 py-2 text-left">Mesa</th>
              <th className="px-4 py-2 text-left">Estado</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {mesas?.map((mesa) => (
              <tr
                key={mesa.id}
                className="border-t border-white/10 bg-perla-azul/60"
              >
                <td className="px-4 py-2">
                  <form
                    action={actualizarMesa.bind(null, mesa.id)}
                    className="flex gap-1"
                  >
                    <input
                      name="numero"
                      defaultValue={mesa.numero}
                      className={`${inputClass} w-32 py-1`}
                    />
                    <button type="submit" className={buttonSecondaryClass}>
                      Guardar
                    </button>
                  </form>
                </td>
                <td className="px-4 py-2">
                  <span
                    className={
                      mesa.activa ? "text-perla-verde-claro" : "text-white/40"
                    }
                  >
                    {mesa.activa ? "Activa" : "Inactiva"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <form
                    action={toggleMesaActiva.bind(null, mesa.id, !mesa.activa)}
                  >
                    <button type="submit" className={buttonSecondaryClass}>
                      {mesa.activa ? "Desactivar" : "Activar"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {!mesas?.length && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-white/50">
                  No hay mesas todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
