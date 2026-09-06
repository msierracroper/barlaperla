import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/auth/roles";
import { ProductosList } from "@/components/admin/productos-list";

export default async function ProductosPage() {
  const usuario = await requireRol("admin");
  const supabase = await createClient();

  const [{ data: productos }, { data: categorias }, { data: licores }] =
    await Promise.all([
      supabase
        .from("productos")
        .select(
          "id, nombre, precio_venta, categoria_id, control_inventario, licor_base_id, stock_minimo, activo, categorias_producto(nombre)"
        )
        .eq("sede_id", usuario.sedeId ?? "")
        .order("nombre"),
      supabase
        .from("categorias_producto")
        .select("id, nombre")
        .eq("sede_id", usuario.sedeId ?? "")
        .eq("activa", true)
        .order("nombre"),
      supabase
        .from("productos")
        .select("id, nombre")
        .eq("sede_id", usuario.sedeId ?? "")
        .eq("control_inventario", "licor_multiuso")
        .eq("activo", true)
        .order("nombre"),
    ]);

  return (
    <ProductosList
      productos={productos ?? []}
      categorias={categorias ?? []}
      licores={licores ?? []}
    />
  );
}
