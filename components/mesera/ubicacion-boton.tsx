import Link from "next/link";

export function UbicacionBoton({
  etiqueta,
  cuentaId,
  accion,
}: {
  etiqueta: string;
  cuentaId: string | null;
  accion: () => Promise<void>;
}) {
  if (cuentaId) {
    return (
      <Link
        href={`/mesera/cuentas/${cuentaId}`}
        className="rounded-lg border border-perla-verde-claro/50 bg-perla-verde/20 p-3 text-center transition hover:bg-perla-verde/30"
      >
        <p className="font-semibold text-white">{etiqueta}</p>
        <p className="text-[11px] text-perla-verde-claro">Abierta</p>
      </Link>
    );
  }

  return (
    <form action={accion}>
      <button
        type="submit"
        className="w-full rounded-lg border border-white/10 bg-perla-azul p-3 text-center transition hover:border-perla-dorado/60"
      >
        <p className="font-semibold text-white">{etiqueta}</p>
        <p className="text-[11px] text-white/40">Libre</p>
      </button>
    </form>
  );
}
