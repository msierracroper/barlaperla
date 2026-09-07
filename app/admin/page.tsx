import Link from "next/link";
import { requireRol } from "@/lib/auth/roles";
import { obtenerResumenDashboard } from "@/lib/dashboard";
import { buttonSecondaryClass } from "@/components/ui/form-controls";

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
    descripcion: "Ventas, productos, meseros, utilidades y más",
    disponible: true,
  },
];

function Kpi({
  label,
  valor,
  nota,
}: {
  label: string;
  valor: string;
  nota?: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-perla-azul p-3 sm:p-5">
      <p className="text-xs text-white/60 sm:text-sm">{label}</p>
      <p className="mt-1 text-xl font-bold text-perla-dorado sm:text-2xl">
        {valor}
      </p>
      {nota && <p className="mt-1 text-[11px] text-white/40 sm:text-xs">{nota}</p>}
    </div>
  );
}

export default async function AdminHomePage() {
  const usuario = await requireRol("admin");

  if (!usuario.sedeId) {
    return <p className="text-white/70">Tu usuario no tiene una sede asignada.</p>;
  }

  const {
    fechaOperativa,
    resumen,
    ubicacionesOcupadas,
    fiadosPendientes,
    topProductos,
    alertasInventario,
    utilidadEstimada,
    totalSemanaAnterior,
  } = await obtenerResumenDashboard(usuario.sedeId);

  const variacionSemana =
    totalSemanaAnterior && totalSemanaAnterior > 0
      ? ((resumen.total - totalSemanaAnterior) / totalSemanaAnterior) * 100
      : null;

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
          Resumen del día · {fechaOperativa}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Kpi
            label="Venta total"
            valor={`$${resumen.total.toLocaleString("es-CO")}`}
            nota={
              variacionSemana !== null
                ? `${variacionSemana >= 0 ? "+" : ""}${variacionSemana.toFixed(0)}% vs. semana pasada`
                : "Sin dato de la semana pasada"
            }
          />
          <Kpi
            label="Utilidad estimada"
            valor={`$${utilidadEstimada.toLocaleString("es-CO")}`}
            nota="Venta - costo - gastos"
          />
          <Kpi
            label="Mesas / barras abiertas"
            valor={`${ubicacionesOcupadas.mesas + ubicacionesOcupadas.barras}`}
            nota={`${ubicacionesOcupadas.mesas} mesas · ${ubicacionesOcupadas.barras} barras`}
          />
          <Kpi
            label="Fiados pendientes"
            valor={`$${fiadosPendientes.monto.toLocaleString("es-CO")}`}
            nota={`${fiadosPendientes.cantidad} cuenta${fiadosPendientes.cantidad === 1 ? "" : "s"}`}
          />
          <Kpi label="Efectivo" valor={`$${resumen.efectivo.toLocaleString("es-CO")}`} />
          <Kpi label="Transferencia" valor={`$${resumen.transferencia.toLocaleString("es-CO")}`} />
          <Kpi label="Fiado (hoy)" valor={`$${resumen.fiado.toLocaleString("es-CO")}`} />
          <Kpi label="Gastos" valor={`$${resumen.gastos.toLocaleString("es-CO")}`} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-perla-azul p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/50">
            Top 5 productos de hoy
          </h3>
          {topProductos.length ? (
            <div className="flex flex-col gap-2">
              {topProductos.map((p, i) => (
                <div key={p.nombre} className="flex items-center justify-between text-sm">
                  <span className="text-white/80">
                    {i + 1}. {p.nombre}
                  </span>
                  <span className="font-semibold text-perla-dorado">{p.cantidad}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/50">Todavía no hay ventas hoy.</p>
          )}
        </div>

        <div className="rounded-lg border border-white/10 bg-perla-azul p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/50">
            Alertas de inventario
          </h3>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-white/80">Agotados</span>
              <span
                className={`font-semibold ${alertasInventario.agotados ? "text-red-400" : "text-white/40"}`}
              >
                {alertasInventario.agotados}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/80">Stock bajo</span>
              <span
                className={`font-semibold ${alertasInventario.bajos ? "text-amber-400" : "text-white/40"}`}
              >
                {alertasInventario.bajos}
              </span>
            </div>
          </div>
          {(alertasInventario.agotados > 0 || alertasInventario.bajos > 0) && (
            <Link
              href="/admin/inventario"
              className={`${buttonSecondaryClass} mt-3 inline-block`}
            >
              Ver inventario
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
