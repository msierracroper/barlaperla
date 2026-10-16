import { requireRol } from "@/lib/auth/roles";
import { AreaHeader } from "@/components/layout/area-header";
import { CajaNav } from "@/components/layout/caja-nav";

export default async function CajaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await requireRol("cajero");

  return (
    <div className="bg-perla-noche flex min-h-svh flex-col text-white">
      <AreaHeader area="Caja" usuario={usuario} />
      <CajaNav />
      <main className="flex-1 p-4 sm:p-6">{children}</main>
    </div>
  );
}
