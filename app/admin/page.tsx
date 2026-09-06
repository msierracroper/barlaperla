import Link from "next/link";

interface Modulo {
  href: string;
  icon: string;
  titulo: string;
  descripcion: string;
  disponible: boolean;
  fase?: string;
}

const MODULOS: Modulo[] = [
  {
    href: "/admin/productos",
    icon: "🍾",
    titulo: "Productos",
    descripcion: "Crear, editar y activar productos",
    disponible: true,
  },
  {
    href: "/admin/mesas",
    icon: "🪑",
    titulo: "Mesas",
    descripcion: "Agregar y activar mesas del local",
    disponible: true,
  },
  {
    href: "/admin/barras",
    icon: "🍸",
    titulo: "Barras",
    descripcion: "Barras y sillas numeradas",
    disponible: true,
  },
  {
    href: "/admin/categorias",
    icon: "🏷️",
    titulo: "Categorías",
    descripcion: "Organiza el menú por categoría",
    disponible: true,
  },
  {
    href: "/admin/usuarios",
    icon: "👥",
    titulo: "Usuarios",
    descripcion: "Crear meseras, preparadores y cajeros",
    disponible: true,
  },
  {
    href: "/admin/pedidos",
    icon: "🧾",
    titulo: "Pedidos",
    descripcion: "Ver, editar, marcar listo/entregado o cancelar",
    disponible: true,
  },
  {
    href: "/admin/gastos",
    icon: "💸",
    titulo: "Gastos",
    descripcion: "Registrar y controlar gastos del negocio",
    disponible: false,
    fase: "Fase 2",
  },
  {
    href: "/admin/inventario",
    icon: "📦",
    titulo: "Inventario",
    descripcion: "Controlar insumos y alertas de stock bajo",
    disponible: true,
  },
  {
    href: "/admin/reportes",
    icon: "📊",
    titulo: "Reportes",
    descripcion: "Ver resumen del día y utilidades",
    disponible: false,
    fase: "Fase 4",
  },
];

const KPIS = [
  { label: "Total vendido", valor: "$0", nota: "0 cuentas cerradas" },
  { label: "Efectivo", valor: "$0", nota: "0% del total" },
  { label: "Transferencia", valor: "$0", nota: "0% del total" },
  { label: "Fiado pendiente", valor: "$0", nota: "0 cuentas" },
];

export default function AdminHomePage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white/50">
          Configuración
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {MODULOS.map((modulo) =>
            modulo.disponible ? (
              <Link
                key={modulo.href}
                href={modulo.href}
                className="group rounded-lg border border-white/10 bg-perla-azul p-3 text-center transition hover:border-perla-dorado/60 hover:bg-perla-azul/80 sm:p-5"
              >
                <div className="text-2xl sm:text-3xl">{modulo.icon}</div>
                <h3 className="mt-2 text-sm font-semibold text-white group-hover:text-perla-dorado sm:mt-3 sm:text-base">
                  {modulo.titulo}
                </h3>
                <p className="mt-1 text-[11px] text-white/60 sm:text-xs">
                  {modulo.descripcion}
                </p>
              </Link>
            ) : (
              <div
                key={modulo.href}
                className="relative rounded-lg border border-white/5 bg-perla-azul/40 p-3 text-center opacity-60 sm:p-5"
              >
                <span className="absolute right-2 top-2 rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-white/50 sm:right-3 sm:top-3 sm:text-[10px]">
                  {modulo.fase}
                </span>
                <div className="text-2xl grayscale sm:text-3xl">
                  {modulo.icon}
                </div>
                <h3 className="mt-2 text-sm font-semibold text-white/70 sm:mt-3 sm:text-base">
                  {modulo.titulo}
                </h3>
                <p className="mt-1 text-[11px] text-white/40 sm:text-xs">
                  {modulo.descripcion}
                </p>
              </div>
            )
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white/50">
          Hoy en el local
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {KPIS.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-lg border border-white/10 bg-perla-azul p-3 sm:p-5"
            >
              <p className="text-xs text-white/60 sm:text-sm">{kpi.label}</p>
              <p className="mt-1 text-xl font-bold text-perla-dorado sm:text-2xl">
                {kpi.valor}
              </p>
              <p className="mt-1 text-[11px] text-white/40 sm:text-xs">
                {kpi.nota}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-white/40">
          Se llena automáticamente cuando la operación de mesera / cajero
          esté activa.
        </p>
      </div>
    </div>
  );
}
