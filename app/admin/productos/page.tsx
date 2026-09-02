import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/auth/roles";
import { Card } from "@/components/ui/card";
import {
  inputClass,
  selectClass,
  buttonPrimaryClass,
  linkButtonClass,
} from "@/components/ui/form-controls";
import { crearProducto, toggleProductoActivo } from "./actions";

const ETIQUETA_CONTROL: Record<string, string> = {
  simple: "Simple (unidad)",
  licor_multiuso: "Licor (botella/shots/cóctel)",
  receta: "Receta de cóctel",
};

export default async function ProductosPage() {
  const usuario = await requireRol("admin");
  const supabase = await createClient();

  const [{ data: productos }, { data: categorias }] = await Promise.all([
    supabase
      .from("productos")
      .select("id, nombre, precio_venta, control_inventario, activo, categorias_producto(nombre)")
      .eq("sede_id", usuario.sedeId ?? "")
      .order("nombre"),
    supabase
      .from("categorias_producto")
      .select("id, nombre")
      .eq("sede_id", usuario.sedeId ?? "")
      .eq("activa", true)
      .order("nombre"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <h2 className="text-xl font-semibold text-perla-dorado">Productos</h2>
        <form
          action={crearProducto}
          className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5"
        >
          <input
            name="nombre"
            placeholder="Nombre"
            required
            className={`${inputClass} lg:col-span-2`}
          />
          <select name="categoria_id" defaultValue="" className={selectClass}>
            <option value="">Sin categoría</option>
            {categorias?.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nombre}
              </option>
            ))}
          </select>
          <select
            name="control_inventario"
            defaultValue="simple"
            className={selectClass}
          >
            <option value="simple">Simple (unidad)</option>
            <option value="licor_multiuso">Licor</option>
            <option value="receta">Receta de cóctel</option>
          </select>
          <input
            name="precio_venta"
            type="number"
            min="0"
            step="1"
            placeholder="Precio"
            required
            className={inputClass}
          />
          <input
            name="stock_minimo"
            type="number"
            min="0"
            step="1"
            placeholder="Stock mínimo (opcional)"
            className={`${inputClass} lg:col-span-4`}
          />
          <button type="submit" className={buttonPrimaryClass}>
            Agregar
          </button>
        </form>
      </Card>

      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-perla-azul text-white/70">
            <tr>
              <th className="px-4 py-2 text-left">Producto</th>
              <th className="px-4 py-2 text-left">Categoría</th>
              <th className="px-4 py-2 text-left">Tipo</th>
              <th className="px-4 py-2 text-right">Precio</th>
              <th className="px-4 py-2 text-left">Estado</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {productos?.map((producto) => (
              <tr
                key={producto.id}
                className="border-t border-white/10 bg-perla-azul/60"
              >
                <td className="px-4 py-2">{producto.nombre}</td>
                <td className="px-4 py-2 text-white/70">
                  {producto.categorias_producto?.nombre ?? "—"}
                </td>
                <td className="px-4 py-2 text-white/70">
                  {ETIQUETA_CONTROL[producto.control_inventario]}
                </td>
                <td className="px-4 py-2 text-right">
                  ${producto.precio_venta.toLocaleString("es-CO")}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={
                      producto.activo
                        ? "text-perla-verde-claro"
                        : "text-white/40"
                    }
                  >
                    {producto.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <form
                    action={toggleProductoActivo.bind(
                      null,
                      producto.id,
                      !producto.activo
                    )}
                  >
                    <button type="submit" className={linkButtonClass}>
                      {producto.activo ? "Desactivar" : "Activar"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {!productos?.length && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-white/50">
                  No hay productos todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
