import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/auth/roles";
import { Card } from "@/components/ui/card";
import { inputClass, buttonPrimaryClass, buttonSecondaryClass } from "@/components/ui/form-controls";
import { crearBarra, toggleBarraActiva, actualizarBarra } from "./actions";

export default async function BarrasPage() {
  const usuario = await requireRol("admin");
  const supabase = await createClient();

  const { data: barras } = await supabase
    .from("barras")
    .select("id, nombre, activa")
    .eq("sede_id", usuario.sedeId ?? "")
    .order("nombre");

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <h2 className="text-xl font-semibold text-perla-dorado">Barras</h2>
        <form action={crearBarra} className="mt-4 flex flex-wrap gap-2">
          <input
            name="nombre"
            placeholder="Ej: Barra 3"
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
              <th className="px-4 py-2 text-left">Barra</th>
              <th className="px-4 py-2 text-left">Estado</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {barras?.map((barra) => (
              <tr
                key={barra.id}
                className="border-t border-white/10 bg-perla-azul/60"
              >
                <td className="px-4 py-2">
                  <Link
                    href={`/admin/barras/${barra.id}`}
                    className="text-perla-dorado hover:underline"
                  >
                    {barra.nombre}
                  </Link>
                  <span className="ml-2 text-white/40">
                    (gestionar sillas)
                  </span>
                  <form
                    action={actualizarBarra.bind(null, barra.id)}
                    className="mt-1 flex gap-1"
                  >
                    <input
                      name="nombre"
                      defaultValue={barra.nombre}
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
                      barra.activa ? "text-perla-verde-claro" : "text-white/40"
                    }
                  >
                    {barra.activa ? "Activa" : "Inactiva"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <form
                    action={toggleBarraActiva.bind(
                      null,
                      barra.id,
                      !barra.activa
                    )}
                  >
                    <button type="submit" className={buttonSecondaryClass}>
                      {barra.activa ? "Desactivar" : "Activar"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {!barras?.length && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-white/50">
                  No hay barras todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
