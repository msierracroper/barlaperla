import { requireRol } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { obtenerTamanoShotMl } from "@/lib/parametros";
import { Card } from "@/components/ui/card";
import { IngresarStockBoton } from "@/components/admin/ingresar-stock-boton";
import { EditarCostoPromedio } from "@/components/admin/editar-costo-promedio";
import { ConvertirBotellaBotones } from "@/components/admin/convertir-botella-botones";
import { TamanoShotInput } from "@/components/admin/tamano-shot-input";
import type { BotellaEstado, ControlInventarioTipo } from "@/types/database.types";

const ETIQUETA_TIPO: Record<ControlInventarioTipo, string> = {
  simple: "Simple",
  licor_multiuso: "Licor (botella)",
  receta: "Receta (cóctel)",
  shot_de_licor: "Shot",
};

export default async function InventarioPage() {
  const usuario = await requireRol("admin");
  const supabase = await createClient();

  if (!usuario.sedeId) {
    return <p className="text-white/70">Tu usuario no tiene una sede asignada.</p>;
  }

  const [{ data: productos }, tamanoShotMl] = await Promise.all([
    supabase
      .from("productos")
      .select(
        "id, nombre, control_inventario, costo_promedio, stock_minimo, categorias_producto(nombre)"
      )
      .eq("sede_id", usuario.sedeId)
      .eq("activo", true)
      .in("control_inventario", ["simple", "licor_multiuso"])
      .order("nombre"),
    obtenerTamanoShotMl(usuario.sedeId),
  ]);

  const productoIds = (productos ?? []).map((p) => p.id);

  const [{ data: stocks }, { data: botellas }] = await Promise.all([
    productoIds.length
      ? supabase
          .from("stock_simple")
          .select("producto_id, cantidad_actual")
          .in("producto_id", productoIds)
      : Promise.resolve({ data: [] as { producto_id: string; cantidad_actual: number }[] }),
    productoIds.length
      ? supabase
          .from("botellas")
          .select("producto_id, estado, volumen_ml_restante")
          .in("producto_id", productoIds)
      : Promise.resolve({
          data: [] as { producto_id: string; estado: BotellaEstado; volumen_ml_restante: number }[],
        }),
  ]);

  const stockPorProducto = new Map(
    (stocks ?? []).map((s) => [s.producto_id, s.cantidad_actual])
  );

  interface ResumenBotellas {
    cerradas: number;
    mlShots: number;
    mlCoctel: number;
  }
  const botellasPorProducto = new Map<string, ResumenBotellas>();
  for (const b of botellas ?? []) {
    const actual = botellasPorProducto.get(b.producto_id) ?? {
      cerradas: 0,
      mlShots: 0,
      mlCoctel: 0,
    };
    if (b.estado === "cerrada") actual.cerradas += 1;
    if (b.estado === "abierta_shots") actual.mlShots += b.volumen_ml_restante;
    if (b.estado === "abierta_coctel") actual.mlCoctel += b.volumen_ml_restante;
    botellasPorProducto.set(b.producto_id, actual);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-perla-dorado">Inventario</h2>
        <p className="text-xs text-white/50">
          Stock actual e ingreso de mercancía nueva.
        </p>
      </div>

      <TamanoShotInput sedeId={usuario.sedeId} tamanoActual={tamanoShotMl} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {productos?.map((producto) => {
          const esSimple = producto.control_inventario === "simple";
          const resumenBotellas = botellasPorProducto.get(producto.id);
          const stockActual = esSimple
            ? (stockPorProducto.get(producto.id) ?? 0)
            : (resumenBotellas?.cerradas ?? 0);
          const stockMinimo = producto.stock_minimo ?? 0;
          const agotado = stockActual <= 0;
          const bajo = !agotado && stockMinimo > 0 && stockActual <= stockMinimo;

          return (
            <Card key={producto.id}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-white">{producto.nombre}</p>
                  <p className="text-xs text-white/50">
                    {producto.categorias_producto?.nombre ?? "Sin categoría"} ·{" "}
                    {ETIQUETA_TIPO[producto.control_inventario]}
                  </p>
                </div>
                {agotado && (
                  <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-300">
                    Agotado
                  </span>
                )}
                {bajo && (
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-300">
                    Stock bajo
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between text-sm text-white/70">
                <span>{esSimple ? "Unidades" : "Botellas cerradas"}</span>
                <span className="text-lg font-bold text-perla-dorado">
                  {stockActual.toLocaleString("es-CO")}
                </span>
              </div>

              {!esSimple && resumenBotellas && (
                <div className="mt-1 flex flex-col gap-0.5 text-xs text-white/50">
                  {resumenBotellas.mlShots > 0 && (
                    <span>Abierta para shots: {resumenBotellas.mlShots}ml restantes</span>
                  )}
                  {resumenBotellas.mlCoctel > 0 && (
                    <span>Abierta para cóctel: {resumenBotellas.mlCoctel}ml restantes</span>
                  )}
                </div>
              )}

              <EditarCostoPromedio
                productoId={producto.id}
                costoActual={producto.costo_promedio}
              />

              <div className="mt-3 flex flex-col gap-2">
                <IngresarStockBoton
                  productoId={producto.id}
                  tipo={producto.control_inventario}
                />
                {!esSimple && (
                  <ConvertirBotellaBotones
                    productoId={producto.id}
                    hayCerradas={(resumenBotellas?.cerradas ?? 0) > 0}
                  />
                )}
              </div>
            </Card>
          );
        })}
        {!productos?.length && (
          <p className="text-sm text-white/50">
            No hay productos con control de inventario simple o de licor
            todavía.
          </p>
        )}
      </div>
    </div>
  );
}
