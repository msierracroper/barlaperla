import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { RolTipo } from "@/types/database.types";

export interface UsuarioActual {
  id: string;
  email: string | null;
  nombre: string;
  sedeId: string | null;
  roles: RolTipo[];
}

/**
 * Resuelve el usuario autenticado (via Supabase Auth) junto con sus roles
 * de negocio (tabla usuario_roles). Memoizado por render con React cache()
 * para no repetir las consultas si varias layouts/paginas lo invocan.
 */
export const getUsuarioActual = cache(async (): Promise<UsuarioActual | null> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: usuarioRow }, { data: rolesRows }] = await Promise.all([
    supabase
      .from("usuarios")
      .select("nombre, sede_id")
      .eq("id", user.id)
      .single(),
    supabase.from("usuario_roles").select("rol").eq("usuario_id", user.id),
  ]);

  return {
    id: user.id,
    email: user.email ?? null,
    nombre: usuarioRow?.nombre ?? user.email ?? "Usuario",
    sedeId: usuarioRow?.sede_id ?? null,
    roles: (rolesRows ?? []).map((r) => r.rol),
  };
});

/**
 * Chequeo de autorizacion "seguro" (contra la base de datos, no solo la
 * cookie de sesion) para usar en layouts/paginas de cada area por rol, y
 * dentro de Server Actions para la regla de negocio de esa accion puntual.
 * El proxy solo hace el chequeo optimista de "hay sesion"; este es el
 * que decide si ESE usuario puede entrar a ESA area / hacer ESA accion.
 *
 * Admin siempre pasa, sea cual sea el rol pedido ("Administrador: acceso
 * total" segun el alcance) -- salvo que la propia Server Action necesite
 * una regla mas estricta que solo admin (ej. cancelar una cuenta completa),
 * en cuyo caso se llama requireRol("admin") directamente, que no se ve
 * afectado por este fallback.
 */
export async function requireRol(rol: RolTipo): Promise<UsuarioActual> {
  const usuario = await getUsuarioActual();

  if (!usuario) {
    redirect("/login");
  }

  const autorizado = usuario.roles.includes(rol) || usuario.roles.includes("admin");
  if (!autorizado) {
    redirect("/no-autorizado");
  }

  return usuario;
}
