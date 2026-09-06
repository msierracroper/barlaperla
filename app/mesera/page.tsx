import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/auth/roles";
import { Card } from "@/components/ui/card";
import { UbicacionBoton } from "@/components/mesera/ubicacion-boton";

export default async function MeseraHomePage() {
  const usuario = await requireRol("mesera");
  const supabase = await createClient();

  const [{ data: mesas }, { data: barras }, { data: cuentasAbiertas }] =
    await Promise.all([
      supabase
        .from("mesas")
        .select("id, numero")
        .eq("sede_id", usuario.sedeId ?? "")
        .eq("activa", true)
        .order("numero"),
      supabase
        .from("barras")
        .select("id, nombre")
        .eq("sede_id", usuario.sedeId ?? "")
        .eq("activa", true)
        .order("nombre"),
      supabase
        .from("cuentas")
        .select("id")
        .eq("sede_id", usuario.sedeId ?? "")
        .eq("estado", "abierta"),
    ]);

  // Ahora una cuenta solo existe una vez que la mesera confirmo un pedido
  // (ver app/mesera/nuevo), asi que "abierta" ya implica que tiene contenido
  // real -- no hace falta filtrar por si tiene items o no.
  const idsAbiertas = (cuentasAbiertas ?? []).map((c) => c.id);

  const { data: ubicaciones } = idsAbiertas.length
    ? await supabase
        .from("cuenta_ubicaciones")
        .select("cuenta_id, mesa_id, silla_barra_id")
        .in("cuenta_id", idsAbiertas)
    : { data: [] as { cuenta_id: string; mesa_id: string | null; silla_barra_id: string | null }[] };

  const cuentaPorMesa = new Map(
    (ubicaciones ?? [])
      .filter((u) => u.mesa_id)
      .map((u) => [u.mesa_id as string, u.cuenta_id])
  );
  const cuentaPorSilla = new Map(
    (ubicaciones ?? [])
      .filter((u) => u.silla_barra_id)
      .map((u) => [u.silla_barra_id as string, u.cuenta_id])
  );

  const barraIds = (barras ?? []).map((b) => b.id);
  const { data: sillas } = barraIds.length
    ? await supabase
        .from("sillas_barra")
        .select("id, barra_id, numero")
        .in("barra_id", barraIds)
        .eq("activa", true)
        .order("numero")
    : { data: [] as { id: string; barra_id: string; numero: string }[] };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <h2 className="text-xl font-semibold text-perla-dorado">Mesas</h2>
        {mesas?.length ? (
          <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {mesas.map((mesa) => (
              <UbicacionBoton
                key={mesa.id}
                etiqueta={mesa.numero}
                cuentaId={cuentaPorMesa.get(mesa.id) ?? null}
                hrefLibre={`/mesera/nuevo?tipo=mesa&ubicacionId=${mesa.id}&etiqueta=${encodeURIComponent(mesa.numero)}`}
              />
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-white/50">
            No hay mesas configuradas todavía. Pídele al admin que las cree.
          </p>
        )}
      </Card>

      {barras?.map((barra) => (
        <Card key={barra.id}>
          <h2 className="text-xl font-semibold text-perla-dorado">
            {barra.nombre}
          </h2>
          <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
            {(sillas ?? [])
              .filter((s) => s.barra_id === barra.id)
              .map((silla) => (
                <UbicacionBoton
                  key={silla.id}
                  etiqueta={silla.numero}
                  cuentaId={cuentaPorSilla.get(silla.id) ?? null}
                  hrefLibre={`/mesera/nuevo?tipo=barra&ubicacionId=${silla.id}&etiqueta=${encodeURIComponent(`${barra.nombre} · Silla ${silla.numero}`)}`}
                />
              ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
