import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/auth/roles";
import { Card } from "@/components/ui/card";
import { inputClass, buttonPrimaryClass, linkButtonClass } from "@/components/ui/form-controls";
import { crearCategoria, toggleCategoriaActiva } from "./actions";

export default async function CategoriasPage() {
  const usuario = await requireRol("admin");
  const supabase = await createClient();

  const { data: categorias } = await supabase
    .from("categorias_producto")
    .select("id, nombre, activa")
    .eq("sede_id", usuario.sedeId ?? "")
    .order("nombre");

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <h2 className="text-xl font-semibold text-perla-dorado">
          Categorías de producto
        </h2>
        <form action={crearCategoria} className="mt-4 flex flex-wrap gap-2">
          <input
            name="nombre"
            placeholder="Ej: Cerveza botella"
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
              <th className="px-4 py-2 text-left">Categoría</th>
              <th className="px-4 py-2 text-left">Estado</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {categorias?.map((categoria) => (
              <tr
                key={categoria.id}
                className="border-t border-white/10 bg-perla-azul/60"
              >
                <td className="px-4 py-2">{categoria.nombre}</td>
                <td className="px-4 py-2">
                  <span
                    className={
                      categoria.activa
                        ? "text-perla-verde-claro"
                        : "text-white/40"
                    }
                  >
                    {categoria.activa ? "Activa" : "Inactiva"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <form
                    action={toggleCategoriaActiva.bind(
                      null,
                      categoria.id,
                      !categoria.activa
                    )}
                  >
                    <button type="submit" className={linkButtonClass}>
                      {categoria.activa ? "Desactivar" : "Activar"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {!categorias?.length && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-white/50">
                  No hay categorías todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
