import { logout } from "@/lib/auth/actions";
import type { UsuarioActual } from "@/lib/auth/roles";

export function AreaHeader({
  area,
  usuario,
}: {
  area: string;
  usuario: UsuarioActual;
}) {
  return (
    <header className="flex items-center justify-between border-b border-perla-dorado/20 bg-perla-azul px-4 py-3 text-white sm:px-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-perla-dorado">
          La Perla Video Bar
        </p>
        <h1 className="text-lg font-semibold">{area}</h1>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span className="hidden text-white/70 sm:inline">
          {usuario.nombre}
        </span>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-md border border-white/20 px-3 py-1.5 transition hover:bg-white/10"
          >
            Salir
          </button>
        </form>
      </div>
    </header>
  );
}
