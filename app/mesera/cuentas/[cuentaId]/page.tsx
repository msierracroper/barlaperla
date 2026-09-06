import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/auth/roles";
import { etiquetasPorCuenta, mesasLibres, sillasLibres } from "@/lib/ubicaciones";
import { adjuntarStock } from "@/lib/inventario";
import { CuentaDetalle } from "@/components/mesera/cuenta-detalle";

export default async function CuentaDetallePage({
  params,
}: {
  params: Promise<{ cuentaId: string }>;
}) {
  const usuario = await requireRol("mesera");
  const { cuentaId } = await params;
  const supabase = await createClient();

  const { data: cuenta } = await supabase
    .from("cuentas")
    .select("id, tipo")
    .eq("id", cuentaId)
    .single();

  if (!cuenta) notFound();

  const etiquetas = await etiquetasPorCuenta([cuentaId]);
  const etiquetaUbicacion = etiquetas.get(cuentaId) ?? "Cuenta";

  const libres = usuario.sedeId
    ? await (cuenta.tipo === "mesa"
        ? mesasLibres(usuario.sedeId)
        : sillasLibres(usuario.sedeId))
    : [];

  const [{ data: subcuentas }, { data: productos }, { data: categorias }] =
    await Promise.all([
      supabase
        .from("subcuentas")
        .select("id, nombre_cliente")
        .eq("cuenta_id", cuentaId)
        .order("created_at"),
      supabase
        .from("productos")
        .select("id, nombre, precio_venta, categoria_id, control_inventario, licor_base_id")
        .eq("sede_id", usuario.sedeId ?? "")
        .eq("activo", true)
        .order("nombre"),
      supabase
        .from("categorias_producto")
        .select("id, nombre")
        .eq("sede_id", usuario.sedeId ?? "")
        .eq("activa", true)
        .order("nombre"),
    ]);

  const subcuentaIds = (subcuentas ?? []).map((s) => s.id);
  const { data: items } = subcuentaIds.length
    ? await supabase
        .from("pedido_items")
        .select("*")
        .in("subcuenta_id", subcuentaIds)
        .order("created_at")
    : { data: [] };

  const productosConStock = await adjuntarStock(productos ?? [], usuario.sedeId);

  return (
    <CuentaDetalle
      cuentaId={cuentaId}
      tipo={cuenta.tipo}
      etiquetaUbicacion={etiquetaUbicacion}
      subcuentasIniciales={subcuentas ?? []}
      itemsIniciales={items ?? []}
      productos={productosConStock}
      categorias={categorias ?? []}
      ubicacionesLibres={libres}
    />
  );
}
