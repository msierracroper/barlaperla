import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/auth/roles";
import { Card } from "@/components/ui/card";
import { inputClass, buttonPrimaryClass, linkButtonClass } from "@/components/ui/form-controls";
import { crearSilla, toggleSillaActiva } from "../actions";

export default async function BarraDetallePage({
  params,
}: {
  params: Promise<{ barraId: string }>;
}) {
  await requireRol("admin");
  const { barraId } = await params;
  const supabase = await createClient();

  const [{ data: barra }, { data: sillas }] = await Promise.all([
    supabase.from("barras").select("id, nombre").eq("id", barraId).single(),
    supabase
      .from("sillas_barra")
      .select("id, numero, activa")
      .eq("barra_id", barraId)
      .order("numero"),
  ]);

  if (!barra) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/barras" className="text-sm text-white/60 hover:text-white">
        ← Volver a barras
      </Link>

      <Card>
        <h2 className="text-xl font-semibold text-perla-dorado">
          Sillas de {barra.nombre}
        </h2>
        <form
          action={crearSilla.bind(null, barraId)}
          className="mt-4 flex flex-wrap gap-2"
        >
          <input
            name="numero"
            placeholder="Ej: 9"
            required
            className={`${inputClass} flex-1 min-w-32`}
          />
          <button type="submit" className={buttonPrimaryClass}>
            Agregar silla
          </button>
        </form>
      </Card>

      <div className="overflow-hidden rounded-lg border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-perla-azul text-white/70">
            <tr>
              <th className="px-4 py-2 text-left">Silla</th>
              <th className="px-4 py-2 text-left">Estado</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {sillas?.map((silla) => (
              <tr
                key={silla.id}
                className="border-t border-white/10 bg-perla-azul/60"
              >
                <td className="px-4 py-2">{silla.numero}</td>
                <td className="px-4 py-2">
                  <span
                    className={
                      silla.activa ? "text-perla-verde-claro" : "text-white/40"
                    }
                  >
                    {silla.activa ? "Activa" : "Inactiva"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <form
                    action={toggleSillaActiva.bind(
                      null,
                      barraId,
                      silla.id,
                      !silla.activa
                    )}
                  >
                    <button type="submit" className={linkButtonClass}>
                      {silla.activa ? "Desactivar" : "Activar"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {!sillas?.length && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-white/50">
                  No hay sillas todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
