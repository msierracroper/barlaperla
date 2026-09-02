import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRol } from "@/lib/auth/roles";
import { Card } from "@/components/ui/card";
import { linkButtonClass } from "@/components/ui/form-controls";
import { CrearUsuarioForm } from "./crear-usuario-form";
import { toggleUsuarioActivo } from "./actions";

const ETIQUETA_ROL: Record<string, string> = {
  admin: "Admin",
  mesera: "Mesera",
  preparador: "Preparador",
  cajero: "Cajero",
};

export default async function UsuariosPage() {
  const usuario = await requireRol("admin");
  const supabase = await createClient();
  const admin = createAdminClient();

  const [{ data: usuarios }, { data: authUsers }] = await Promise.all([
    supabase
      .from("usuarios")
      .select("id, nombre, telefono, activo, usuario_roles(rol)")
      .eq("sede_id", usuario.sedeId ?? "")
      .order("nombre"),
    admin.auth.admin.listUsers(),
  ]);

  const emailPorId = new Map(
    (authUsers?.users ?? []).map((u) => [u.id, u.email ?? "—"])
  );

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <h2 className="text-xl font-semibold text-perla-dorado">Usuarios</h2>
        <CrearUsuarioForm />
      </Card>

      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-perla-azul text-white/70">
            <tr>
              <th className="px-4 py-2 text-left">Nombre</th>
              <th className="px-4 py-2 text-left">Correo</th>
              <th className="px-4 py-2 text-left">Roles</th>
              <th className="px-4 py-2 text-left">Estado</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {usuarios?.map((u) => (
              <tr
                key={u.id}
                className="border-t border-white/10 bg-perla-azul/60"
              >
                <td className="px-4 py-2">{u.nombre}</td>
                <td className="px-4 py-2 text-white/70">
                  {emailPorId.get(u.id) ?? "—"}
                </td>
                <td className="px-4 py-2 text-white/70">
                  {u.usuario_roles.map((r) => ETIQUETA_ROL[r.rol]).join(", ") ||
                    "—"}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={
                      u.activo ? "text-perla-verde-claro" : "text-white/40"
                    }
                  >
                    {u.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <form
                    action={toggleUsuarioActivo.bind(null, u.id, !u.activo)}
                  >
                    <button type="submit" className={linkButtonClass}>
                      {u.activo ? "Desactivar" : "Activar"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {!usuarios?.length && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-white/50">
                  No hay usuarios todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
