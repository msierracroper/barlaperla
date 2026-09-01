import { redirect } from "next/navigation";
import { getUsuarioActual } from "@/lib/auth/roles";

const AREA_POR_ROL = {
  admin: "/admin",
  cajero: "/caja",
  mesera: "/mesera",
  preparador: "/cocina",
} as const;

export default async function Home() {
  const usuario = await getUsuarioActual();

  if (!usuario) {
    redirect("/login");
  }

  for (const rol of Object.keys(AREA_POR_ROL) as (keyof typeof AREA_POR_ROL)[]) {
    if (usuario.roles.includes(rol)) {
      redirect(AREA_POR_ROL[rol]);
    }
  }

  redirect("/no-autorizado");
}
