import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRol } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { etiquetasPorCuenta } from "@/lib/ubicaciones";
import { calcularTotalItem } from "@/lib/precio";
import { Card } from "@/components/ui/card";
import { PagoForm } from "@/components/caja/pago-form";
import { AnularItemBoton } from "@/components/caja/anular-item-boton";
import { CancelarCuentaBoton } from "@/components/caja/cancelar-cuenta-boton";

export default async function CobrarCuentaPage({
  params,
}: {
  params: Promise<{ cuentaId: string }>;
}) {
  const usuario = await requireRol("cajero");
  const { cuentaId } = await params;
  const supabase = await createClient();

  const { data: cuenta } = await supabase
    .from("cuentas")
    .select("id, tipo, estado")
    .eq("id", cuentaId)
    .single();

  if (!cuenta) notFound();

  const { data: subcuentas } = await supabase
    .from("subcuentas")
    .select("id, nombre_cliente, estado")
    .eq("cuenta_id", cuentaId)
    .order("created_at");

  const subcuentaIds = (subcuentas ?? []).map((s) => s.id);

  const [{ data: items }, { data: productos }, etiquetas] = await Promise.all([
    subcuentaIds.length
      ? supabase
          .from("pedido_items")
          .select("id, subcuenta_id, producto_id, cantidad, precio_unitario, precio_modificador, anulado, motivo_anulacion")
          .in("subcuenta_id", subcuentaIds)
          .order("created_at")
      : Promise.resolve({
          data: [] as {
            id: string;
            subcuenta_id: string;
            producto_id: string;
            cantidad: number;
            precio_unitario: number;
            precio_modificador: number | null;
            anulado: boolean;
            motivo_anulacion: string | null;
          }[],
        }),
    supabase.from("productos").select("id, nombre"),
    etiquetasPorCuenta([cuentaId]),
  ]);

  const nombrePorProducto = new Map((productos ?? []).map((p) => [p.id, p.nombre]));

  const { data: clientesFiado } = usuario.sedeId
    ? await supabase
        .from("clientes_fiado")
        .select("id, nombre, telefono")
        .eq("sede_id", usuario.sedeId)
        .eq("activo", true)
        .order("nombre")
    : { data: [] as { id: string; nombre: string; telefono: string | null }[] };

  if (cuenta.estado !== "abierta") {
    return (
      <div className="flex flex-col gap-6">
        <Link href="/caja" className="text-sm text-white/60 hover:text-white">
          ← Volver
        </Link>
        <Card>
          <p className="text-white/70">
            {cuenta.estado === "anulada"
              ? "Esta cuenta fue cancelada sin cobrar."
              : "Esta cuenta ya fue cerrada."}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/caja" className="text-sm text-white/60 hover:text-white">
        ← Volver
      </Link>

      <h2 className="font-display text-xl text-perla-dorado">
        {etiquetas.get(cuentaId) ?? "Cuenta"}
      </h2>

      {subcuentas?.map((subcuenta) => {
        const itemsSubcuenta = (items ?? []).filter(
          (i) => i.subcuenta_id === subcuenta.id
        );
        const itemsActivos = itemsSubcuenta.filter((i) => !i.anulado);
        const total = itemsActivos.reduce(
          (acc, i) => acc + calcularTotalItem(i),
          0
        );
        const pagada = subcuenta.estado === "cerrada";

        return (
          <Card key={subcuenta.id}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">
                {subcuenta.nombre_cliente}
              </h3>
              {pagada && (
                <span className="text-xs text-perla-verde-claro">✓ Pagada</span>
              )}
            </div>

            <div className="mt-3 flex flex-col gap-1.5 text-sm text-white/70">
              {itemsSubcuenta.map((item) =>
                item.anulado ? (
                  <div
                    key={item.id}
                    className="flex justify-between text-white/30 line-through"
                  >
                    <span>
                      {item.cantidad}x{" "}
                      {nombrePorProducto.get(item.producto_id) ?? "Producto"}
                      <span className="ml-2 text-xs no-underline">
                        (anulado{item.motivo_anulacion ? `: ${item.motivo_anulacion}` : ""})
                      </span>
                    </span>
                    <span>${calcularTotalItem(item).toLocaleString("es-CO")}</span>
                  </div>
                ) : (
                  <div key={item.id} className="flex items-center justify-between">
                    <span>
                      {item.cantidad}x{" "}
                      {nombrePorProducto.get(item.producto_id) ?? "Producto"}
                    </span>
                    <div className="flex items-center gap-3">
                      <span>${calcularTotalItem(item).toLocaleString("es-CO")}</span>
                      {!pagada && (
                        <AnularItemBoton cuentaId={cuentaId} itemId={item.id} />
                      )}
                    </div>
                  </div>
                )
              )}
              {!itemsSubcuenta.length && (
                <p className="text-white/40">Sin items.</p>
              )}
            </div>

            <div className="mt-3 flex justify-between border-t border-white/10 pt-3 font-display text-lg text-perla-dorado">
              <span>Total</span>
              <span>${total.toLocaleString("es-CO")}</span>
            </div>

            {!pagada && (
              <div className="mt-4 border-t border-white/10 pt-4">
                <PagoForm
                  cuentaId={cuentaId}
                  subcuentaId={subcuenta.id}
                  total={total}
                  clientesFiado={clientesFiado ?? []}
                />
              </div>
            )}
          </Card>
        );
      })}

      {usuario.roles.includes("admin") && (
        <CancelarCuentaBoton cuentaId={cuentaId} />
      )}
    </div>
  );
}
