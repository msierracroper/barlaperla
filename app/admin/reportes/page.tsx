import { requireRol } from "@/lib/auth/roles";
import { obtenerJornadaActiva } from "@/lib/jornada";
import { construirReportes, resolverRangoFechas, type PresetRango } from "@/lib/reportes";
import { ReportesView } from "@/components/admin/reportes-view";

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; desde?: string; hasta?: string }>;
}) {
  const usuario = await requireRol("admin");

  if (!usuario.sedeId) {
    return <p className="text-white/70">Tu usuario no tiene una sede asignada.</p>;
  }

  const { preset, desde, hasta } = await searchParams;
  const jornadaHoy = await obtenerJornadaActiva(usuario.sedeId);

  const presetValido: PresetRango =
    preset === "semana" || preset === "mes" || preset === "personalizado"
      ? preset
      : "hoy";

  const rango = resolverRangoFechas(presetValido, jornadaHoy.fecha_operativa, desde, hasta);
  const datos = await construirReportes(usuario.sedeId, rango.desde, rango.hasta);

  return (
    <ReportesView
      preset={presetValido}
      desde={rango.desde}
      hasta={rango.hasta}
      datos={datos}
    />
  );
}
