import Link from "next/link";
import { logout } from "@/lib/auth/actions";

export default function NoAutorizadoPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-perla-azul-deep px-4 text-center text-white">
      <h1 className="text-2xl font-bold text-perla-dorado">
        No tienes acceso a esta sección
      </h1>
      <p className="text-white/70">
        Tu usuario no tiene el rol necesario para ver esta área. Si crees que
        es un error, contacta al administrador.
      </p>
      <div className="flex gap-3">
        <Link
          href="/"
          className="rounded-md border border-white/20 px-4 py-2 hover:bg-white/10"
        >
          Ir al inicio
        </Link>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-md bg-perla-rojo px-4 py-2 font-semibold hover:brightness-110"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </main>
  );
}
