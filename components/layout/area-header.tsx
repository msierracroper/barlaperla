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
    <header className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-3 text-white backdrop-blur-xl sm:px-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-perla-dorado">
          La Perla Video Bar
        </p>
        <h1 className="font-display text-lg text-white">{area}</h1>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span className="hidden text-white/70 sm:inline">
          {usuario.nombre}
        </span>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-full border border-white/20 px-3 py-1.5 transition hover:border-perla-cian/40 hover:bg-white/10"
          >
            Salir
          </button>
        </form>
      </div>
    </header>
  );
}
