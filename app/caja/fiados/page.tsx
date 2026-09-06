import { requireRol } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { AbonarFiadoBoton } from "@/components/caja/abonar-fiado-boton";

export default async function FiadosPage() {
  const usuario = await requireRol("cajero");

  if (!usuario.sedeId) {
    return <p className="text-white/70">Tu usuario no tiene una sede asignada.</p>;
  }

  const supabase = await createClient();

  const { data: clientes } = await supabase
    .from("clientes_fiado")
    .select("id, nombre, telefono")
    .eq("sede_id", usuario.sedeId);

  const clienteIds = (clientes ?? []).map((c) => c.id);
  const nombrePorCliente = new Map(
    (clientes ?? []).map((c) => [c.id, { nombre: c.nombre, telefono: c.telefono }])
  );

  const { data: fiados } = clienteIds.length
    ? await supabase
        .from("fiados")
        .select("id, cliente_fiado_id, monto_total, monto_pagado, estado, created_at")
        .in("cliente_fiado_id", clienteIds)
        .neq("estado", "pagado")
        .order("created_at")
    : { data: [] as { id: string; cliente_fiado_id: string; monto_total: number; monto_pagado: number; estado: string; created_at: string }[] };

  const saldoTotal = (fiados ?? []).reduce(
    (acc, f) => acc + (f.monto_total - f.monto_pagado),
    0
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-perla-dorado">
          Fiados pendientes
        </h2>
        <p className="text-xs text-white/50">
          {fiados?.length ?? 0} cuentas por cobrar · Saldo total $
          {saldoTotal.toLocaleString("es-CO")}
        </p>
      </div>

      {fiados?.length ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {fiados.map((fiado) => {
            const cliente = nombrePorCliente.get(fiado.cliente_fiado_id);
            const saldo = fiado.monto_total - fiado.monto_pagado;

            return (
              <Card key={fiado.id}>
                <p className="font-semibold text-white">
                  {cliente?.nombre ?? "Cliente"}
                </p>
                {cliente?.telefono && (
                  <p className="text-xs text-white/50">{cliente.telefono}</p>
                )}
                <div className="mt-2 flex flex-col gap-1 text-sm text-white/70">
                  <div className="flex justify-between">
                    <span>Total fiado</span>
                    <span>${fiado.monto_total.toLocaleString("es-CO")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Abonado</span>
                    <span>${fiado.monto_pagado.toLocaleString("es-CO")}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-perla-dorado">
                    <span>Saldo</span>
                    <span>${saldo.toLocaleString("es-CO")}</span>
                  </div>
                </div>
                <div className="mt-3">
                  <AbonarFiadoBoton fiadoId={fiado.id} saldo={saldo} />
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-white/50">
          No hay fiados pendientes por cobrar.
        </p>
      )}
    </div>
  );
}
