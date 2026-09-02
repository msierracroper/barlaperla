import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/auth/roles";
import { etiquetasPorCuenta } from "@/lib/ubicaciones";
import { ComandasPendientes } from "@/components/cocina/comandas-pendientes";

export default async function CocinaHomePage() {
  const usuario = await requireRol("preparador");
  const supabase = await createClient();

  const { data: cuentas } = await supabase
    .from("cuentas")
    .select("id")
    .eq("sede_id", usuario.sedeId ?? "")
    .eq("estado", "abierta");

  const cuentaIds = (cuentas ?? []).map((c) => c.id);

  if (!cuentaIds.length) {
    return (
      <ComandasPendientes
        itemsIniciales={[]}
        productos={[]}
        etiquetaPorSubcuenta={{}}
      />
    );
  }

  const [{ data: subcuentas }, etiquetasCuenta, { data: productos }] =
    await Promise.all([
      supabase.from("subcuentas").select("id, cuenta_id").in("cuenta_id", cuentaIds),
      etiquetasPorCuenta(cuentaIds),
      supabase.from("productos").select("id, nombre").eq("sede_id", usuario.sedeId ?? ""),
    ]);

  const etiquetaPorSubcuenta: Record<string, string> = {};
  for (const subcuenta of subcuentas ?? []) {
    etiquetaPorSubcuenta[subcuenta.id] =
      etiquetasCuenta.get(subcuenta.cuenta_id) ?? "Cuenta";
  }

  const subcuentaIds = (subcuentas ?? []).map((s) => s.id);
  const { data: items } = subcuentaIds.length
    ? await supabase
        .from("pedido_items")
        .select("*")
        .in("subcuenta_id", subcuentaIds)
        .in("estado", ["pendiente", "listo"])
        .order("created_at")
    : { data: [] };

  return (
    <ComandasPendientes
      itemsIniciales={items ?? []}
      productos={productos ?? []}
      etiquetaPorSubcuenta={etiquetaPorSubcuenta}
    />
  );
}
