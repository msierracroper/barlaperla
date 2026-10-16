import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRol } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { RecetaEditor } from "@/components/admin/receta-editor";

export default async function RecetaProductoPage({
  params,
}: {
  params: Promise<{ productoId: string }>;
}) {
  const usuario = await requireRol("admin");
  const { productoId } = await params;
  const supabase = await createClient();

  const { data: producto } = await supabase
    .from("productos")
    .select("id, nombre, control_inventario")
    .eq("id", productoId)
    .single();

  if (!producto || producto.control_inventario !== "receta") notFound();

  const [{ data: ingredientesReceta }, { data: licores }] = await Promise.all([
    supabase
      .from("recetas_coctel")
      .select("id, producto_ingrediente_id, cantidad_ml")
      .eq("producto_coctel_id", productoId),
    supabase
      .from("productos")
      .select("id, nombre")
      .eq("sede_id", usuario.sedeId ?? "")
      .eq("control_inventario", "licor_multiuso")
      .eq("activo", true)
      .order("nombre"),
  ]);

  const nombrePorLicor = new Map((licores ?? []).map((l) => [l.id, l.nombre]));
  const receta = (ingredientesReceta ?? []).map((r) => ({
    id: r.id,
    cantidadMl: r.cantidad_ml,
    ingredienteId: r.producto_ingrediente_id,
    ingredienteNombre: nombrePorLicor.get(r.producto_ingrediente_id) ?? "Ingrediente",
  }));

  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin/productos" className="text-sm text-white/60 hover:text-white">
        ← Volver a productos
      </Link>
      <h2 className="font-display text-xl text-perla-dorado">
        Receta de {producto.nombre}
      </h2>
      <RecetaEditor
        productoCoctelId={productoId}
        receta={receta}
        licores={licores ?? []}
      />
    </div>
  );
}
