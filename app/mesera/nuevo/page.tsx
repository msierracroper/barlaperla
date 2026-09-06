import { redirect } from "next/navigation";
import { requireRol } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { NuevoPedido } from "@/components/mesera/nuevo-pedido";
import { adjuntarStock } from "@/lib/inventario";
import type { CuentaTipo } from "@/types/database.types";

export default async function NuevoPedidoPage({
  searchParams,
}: {
  searchParams: Promise<{
    tipo?: string;
    ubicacionId?: string;
    etiqueta?: string;
  }>;
}) {
  const usuario = await requireRol("mesera");
  const { tipo, ubicacionId, etiqueta } = await searchParams;

  if ((tipo !== "mesa" && tipo !== "barra") || !ubicacionId) {
    redirect("/mesera");
  }

  const supabase = await createClient();

  const [{ data: productos }, { data: categorias }] = await Promise.all([
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

  const productosConStock = await adjuntarStock(productos ?? [], usuario.sedeId);

  return (
    <NuevoPedido
      tipo={tipo as CuentaTipo}
      ubicacionId={ubicacionId}
      etiqueta={etiqueta ?? "Cuenta"}
      productos={productosConStock}
      categorias={categorias ?? []}
    />
  );
}
