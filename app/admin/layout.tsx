import { requireRol } from "@/lib/auth/roles";
import { AreaHeader } from "@/components/layout/area-header";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await requireRol("admin");

  return (
    <div className="flex min-h-svh flex-col bg-perla-azul-deep text-white">
      <AreaHeader area="Administración" usuario={usuario} />
      <main className="flex-1 p-4 sm:p-6">{children}</main>
    </div>
  );
}
