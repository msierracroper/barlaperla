import { requireRol } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { obtenerJornadaActiva } from "@/lib/jornada";
import { etiquetasPorCuenta } from "@/lib/ubicaciones";
import { calcularTotalItem } from "@/lib/precio";
import { PedidosList } from "@/components/admin/pedidos-list";

export default async function AdminPedidosPage() {
  const usuario = await requireRol("admin");

  if (!usuario.sedeId) {
    return <p className="text-white/70">Tu usuario no tiene una sede asignada.</p>;
  }

  const jornada = await obtenerJornadaActiva(usuario.sedeId);
  const supabase = await createClient();

  const { data: cuentas } = await supabase
    .from("cuentas")
    .select("id, estado, creado_por, created_at")
    .eq("jornada_id", jornada.id)
    .order("created_at", { ascending: false });

  const cuentaIds = (cuentas ?? []).map((c) => c.id);
  const meseraIds = [...new Set((cuentas ?? []).map((c) => c.creado_por))];

  const [etiquetas, { data: meseras }, { data: subcuentas }] = await Promise.all([
    etiquetasPorCuenta(cuentaIds),
    meseraIds.length
      ? supabase.from("usuarios").select("id, nombre").in("id", meseraIds)
      : Promise.resolve({ data: [] as { id: string; nombre: string }[] }),
    cuentaIds.length
      ? supabase.from("subcuentas").select("id, cuenta_id").in("cuenta_id", cuentaIds)
      : Promise.resolve({ data: [] as { id: string; cuenta_id: string }[] }),
  ]);

  const nombrePorMesera = new Map((meseras ?? []).map((m) => [m.id, m.nombre]));
  const cuentaPorSubcuenta = new Map(
    (subcuentas ?? []).map((s) => [s.id, s.cuenta_id])
  );
  const subcuentaIds = (subcuentas ?? []).map((s) => s.id);

  const { data: items } = subcuentaIds.length
    ? await supabase
        .from("pedido_items")
        .select("subcuenta_id, cantidad, precio_unitario, precio_modificador, anulado")
        .in("subcuenta_id", subcuentaIds)
    : { data: [] };

  const totalPorCuenta = new Map<string, number>();
  for (const item of items ?? []) {
    const cuentaId = cuentaPorSubcuenta.get(item.subcuenta_id);
    if (!cuentaId) continue;
    totalPorCuenta.set(
      cuentaId,
      (totalPorCuenta.get(cuentaId) ?? 0) + calcularTotalItem(item)
    );
  }

  const pedidos = (cuentas ?? []).map((cuenta) => ({
    id: cuenta.id,
    etiqueta: etiquetas.get(cuenta.id) ?? "Cuenta",
    mesera: nombrePorMesera.get(cuenta.creado_por) ?? "—",
    estado: cuenta.estado,
    total: totalPorCuenta.get(cuenta.id) ?? 0,
    createdAt: cuenta.created_at,
  }));

  return <PedidosList pedidos={pedidos} />;
}
