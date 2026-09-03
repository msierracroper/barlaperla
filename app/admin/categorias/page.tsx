import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/auth/roles";
import { CategoriasList } from "@/components/admin/categorias-list";

export default async function CategoriasPage() {
  const usuario = await requireRol("admin");
  const supabase = await createClient();

  const { data: categorias } = await supabase
    .from("categorias_producto")
    .select("id, nombre, activa")
    .eq("sede_id", usuario.sedeId ?? "")
    .order("nombre");

  return <CategoriasList categorias={categorias ?? []} />;
}
