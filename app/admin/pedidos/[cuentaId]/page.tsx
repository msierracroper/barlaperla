import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRol } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { etiquetasPorCuenta } from "@/lib/ubicaciones";
import { adjuntarStock } from "@/lib/inventario";
import { PedidoDetalle } from "@/components/admin/pedido-detalle";

export default async function AdminPedidoDetallePage({
  params,
}: {
  params: Promise<{ cuentaId: string }>;
}) {
  const usuario = await requireRol("admin");
  const { cuentaId } = await params;
  const supabase = await createClient();

  const { data: cuenta } = await supabase
    .from("cuentas")
    .select("id, estado")
    .eq("id", cuentaId)
    .single();

  if (!cuenta) notFound();

  const etiquetas = await etiquetasPorCuenta([cuentaId]);

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
    <div className="flex flex-col gap-4">
      <Link href="/admin/pedidos" className="text-sm text-white/60 hover:text-white">
        ← Volver a pedidos
      </Link>
      <PedidoDetalle
        cuentaId={cuentaId}
        etiqueta={etiquetas.get(cuentaId) ?? "Cuenta"}
        estadoCuenta={cuenta.estado}
        subcuentas={subcuentas ?? []}
        itemsIniciales={items ?? []}
        productos={productosConStock}
        categorias={categorias ?? []}
      />
    </div>
  );
}
