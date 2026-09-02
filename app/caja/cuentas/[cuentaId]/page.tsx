import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRol } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { etiquetasPorCuenta } from "@/lib/ubicaciones";
import { calcularTotalItem } from "@/lib/precio";
import { Card } from "@/components/ui/card";
import { PagoForm } from "@/components/caja/pago-form";

export default async function CobrarCuentaPage({
  params,
}: {
  params: Promise<{ cuentaId: string }>;
}) {
  await requireRol("cajero");
  const { cuentaId } = await params;
  const supabase = await createClient();

  const { data: cuenta } = await supabase
    .from("cuentas")
    .select("id, tipo, estado")
    .eq("id", cuentaId)
    .single();

  if (!cuenta) notFound();

  const { data: subcuenta } = await supabase
    .from("subcuentas")
    .select("id")
    .eq("cuenta_id", cuentaId)
    .single();

  if (!subcuenta) notFound();

  const [{ data: items }, { data: productos }, etiquetas] = await Promise.all([
    supabase
      .from("pedido_items")
      .select("id, producto_id, cantidad, precio_unitario, precio_modificador, anulado")
      .eq("subcuenta_id", subcuenta.id)
      .order("created_at"),
    supabase.from("productos").select("id, nombre"),
    etiquetasPorCuenta([cuentaId]),
  ]);

  const nombrePorProducto = new Map((productos ?? []).map((p) => [p.id, p.nombre]));
  const itemsActivos = (items ?? []).filter((i) => !i.anulado);
  const total = itemsActivos.reduce((acc, i) => acc + calcularTotalItem(i), 0);

  if (cuenta.estado !== "abierta") {
    return (
      <div className="flex flex-col gap-6">
        <Link href="/caja" className="text-sm text-white/60 hover:text-white">
          ← Volver
        </Link>
        <Card>
          <p className="text-white/70">Esta cuenta ya fue cerrada.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/caja" className="text-sm text-white/60 hover:text-white">
        ← Volver
      </Link>

      <Card>
        <h2 className="text-xl font-semibold text-perla-dorado">
          {etiquetas.get(cuentaId) ?? "Cuenta"}
        </h2>
        <div className="mt-4 flex flex-col gap-1 text-sm text-white/70">
          {itemsActivos.map((item) => (
            <div key={item.id} className="flex justify-between">
              <span>
                {item.cantidad}x {nombrePorProducto.get(item.producto_id) ?? "Producto"}
              </span>
              <span>${calcularTotalItem(item).toLocaleString("es-CO")}</span>
            </div>
          ))}
          {!itemsActivos.length && (
            <p className="text-white/40">Esta cuenta no tiene items.</p>
          )}
        </div>
        <div className="mt-3 flex justify-between border-t border-white/10 pt-3 text-lg font-bold text-perla-dorado">
          <span>Total</span>
          <span>${total.toLocaleString("es-CO")}</span>
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 font-semibold text-white">Registrar pago</h3>
        <PagoForm cuentaId={cuentaId} subcuentaId={subcuenta.id} total={total} />
      </Card>
    </div>
  );
}
