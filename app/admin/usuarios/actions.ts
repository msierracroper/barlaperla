"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRol } from "@/lib/auth/roles";
import type { RolTipo } from "@/types/database.types";

const ROLES_VALIDOS: RolTipo[] = ["admin", "mesera", "preparador", "cajero"];

export interface UsuarioFormState {
  error?: string;
  success?: boolean;
}

export async function crearUsuario(
  _prevState: UsuarioFormState,
  formData: FormData
): Promise<UsuarioFormState> {
  const usuario = await requireRol("admin");
  if (!usuario.sedeId) {
    return { error: "No se pudo determinar la sede del administrador." };
  }

  const nombre = String(formData.get("nombre") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const telefono = String(formData.get("telefono") ?? "").trim() || null;
  const roles = formData
    .getAll("roles")
    .map(String)
    .filter((r): r is RolTipo => ROLES_VALIDOS.includes(r as RolTipo));

  if (!nombre || !email || password.length < 6 || roles.length === 0) {
    return {
      error:
        "Completa nombre, correo, contraseña (mín. 6 caracteres) y selecciona al menos un rol.",
    };
  }

  const admin = createAdminClient();

  const { data: creado, error: errorAuth } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (errorAuth || !creado.user) {
    return { error: errorAuth?.message ?? "No se pudo crear el usuario." };
  }

  const supabase = await createClient();

  const { error: errorUsuario } = await supabase.from("usuarios").insert({
    id: creado.user.id,
    sede_id: usuario.sedeId,
    nombre,
    telefono,
  });

  if (errorUsuario) {
    await admin.auth.admin.deleteUser(creado.user.id);
    return { error: "No se pudo guardar el usuario en la base de datos." };
  }

  const { error: errorRoles } = await supabase
    .from("usuario_roles")
    .insert(roles.map((rol) => ({ usuario_id: creado.user.id, rol })));

  if (errorRoles) {
    return { error: "El usuario se creó pero falló al asignar los roles." };
  }

  revalidatePath("/admin/usuarios");
  return { success: true };
}

export async function toggleUsuarioActivo(
  usuarioId: string,
  activo: boolean
) {
  await requireRol("admin");
  const supabase = await createClient();
  await supabase.from("usuarios").update({ activo }).eq("id", usuarioId);
  revalidatePath("/admin/usuarios");
}

export async function actualizarUsuario(usuarioId: string, formData: FormData) {
  await requireRol("admin");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim() || null;
  if (!nombre) return;

  const supabase = await createClient();
  await supabase
    .from("usuarios")
    .update({ nombre, telefono })
    .eq("id", usuarioId);
  revalidatePath("/admin/usuarios");
}
