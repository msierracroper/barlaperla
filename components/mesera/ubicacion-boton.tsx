import Link from "next/link";

export function UbicacionBoton({
  etiqueta,
  cuentaId,
  hrefLibre,
}: {
  etiqueta: string;
  cuentaId: string | null;
  hrefLibre: string;
}) {
  if (cuentaId) {
    return (
      <Link
        href={`/mesera/cuentas/${cuentaId}`}
        className="rounded-xl border border-perla-cian/60 bg-gradient-to-br from-perla-cian/20 to-perla-magenta/10 p-3 text-center shadow-[0_0_18px_-4px_rgba(54,224,214,0.5)] backdrop-blur-xl transition hover:shadow-[0_0_22px_-2px_rgba(54,224,214,0.7)]"
      >
        <p className="font-semibold text-white">{etiqueta}</p>
        <p className="text-[11px] text-perla-cian">● Abierta</p>
      </Link>
    );
  }

  return (
    <Link
      href={hrefLibre}
      className="block rounded-xl border border-white/10 bg-white/5 p-3 text-center backdrop-blur-xl transition hover:border-perla-dorado/60"
    >
      <p className="font-semibold text-white">{etiqueta}</p>
      <p className="text-[11px] text-white/40">Libre</p>
    </Link>
  );
}
