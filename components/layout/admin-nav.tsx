"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ENLACES = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/mesas", label: "Mesas" },
  { href: "/admin/barras", label: "Barras" },
  { href: "/admin/categorias", label: "Categorías" },
  { href: "/admin/productos", label: "Productos" },
  { href: "/admin/usuarios", label: "Usuarios" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/inventario", label: "Inventario" },
  { href: "/admin/reportes", label: "Reportes" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-white/10 bg-perla-azul-deep px-4 py-2 sm:px-6">
      {ENLACES.map((enlace) => {
        const activo =
          enlace.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(enlace.href);

        return (
          <Link
            key={enlace.href}
            href={enlace.href}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm transition ${
              activo
                ? "bg-perla-dorado font-semibold text-perla-azul-deep shadow-[0_0_14px_-3px_rgba(242,193,78,0.7)]"
                : "text-white/70 hover:bg-white/10"
            }`}
          >
            {enlace.label}
          </Link>
        );
      })}
    </nav>
  );
}
