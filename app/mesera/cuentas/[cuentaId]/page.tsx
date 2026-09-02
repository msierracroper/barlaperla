import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/auth/roles";
import { etiquetasPorCuenta } from "@/lib/ubicaciones";
import { calcularTotalItem } from "@/lib/precio";
import { Card } from "@/components/ui/card";
import { MenuSelector } from "@/components/mesera/menu-selector";
import { PedidoItemsList } from "@/components/mesera/pedido-items-list";

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
    .select("id, tipo, estado")
    .eq("id", cuentaId)
    .single();

  if (!cuenta) notFound();

  const etiquetas = await etiquetasPorCuenta([cuentaId]);
  const etiquetaUbicacion = etiquetas.get(cuentaId) ?? "Cuenta";

  const { data: subcuenta } = await supabase
    .from("subcuentas")
    .select("id, nombre_cliente")
    .eq("cuenta_id", cuentaId)
    .single();

  const [{ data: productos }, { data: categorias }] = await Promise.all([
    supabase
      .from("productos")
      .select("id, nombre, precio_venta, categoria_id")
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

  const { data: items } = subcuenta
    ? await supabase
        .from("pedido_items")
        .select("*")
        .eq("subcuenta_id", subcuenta.id)
        .order("created_at")
    : { data: [] };

  const total = (items ?? []).reduce(
    (acc, item) => acc + calcularTotalItem(item),
    0
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link
          href="/mesera"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
          aria-label="Volver"
        >
          ←
        </Link>
        <div className="text-center">
          <p className="text-xs uppercase tracking-wide text-white/40">
            Nuevo pedido
          </p>
          <h2 className="text-lg font-semibold text-perla-dorado">
            {etiquetaUbicacion}
          </h2>
        </div>
        <p className="text-lg font-bold text-perla-dorado">
          ${total.toLocaleString("es-CO")}
        </p>
      </div>

      {subcuenta && (
        <>
          <Card>
            <MenuSelector
              cuentaId={cuentaId}
              subcuentaId={subcuenta.id}
              categorias={categorias ?? []}
              productos={productos ?? []}
            />
          </Card>

          <PedidoItemsList
            cuentaId={cuentaId}
            subcuentaId={subcuenta.id}
            itemsIniciales={items ?? []}
            productos={productos ?? []}
          />
        </>
      )}
    </div>
  );
}
