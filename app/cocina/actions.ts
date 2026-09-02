"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/auth/roles";

export async function marcarListoPorSubcuenta(subcuentaId: string) {
  const usuario = await requireRol("preparador");
  const supabase = await createClient();

  await supabase
    .from("pedido_items")
    .update({
      estado: "listo",
      preparado_por: usuario.id,
      preparado_at: new Date().toISOString(),
    })
    .eq("subcuenta_id", subcuentaId)
    .eq("estado", "pendiente");

  revalidatePath("/cocina");
}
