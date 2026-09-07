import "server-only";

import { createClient } from "@/lib/supabase/server";
import { calcularResumenCaja, type ResumenCaja } from "@/lib/caja";
import { calcularTotalItem } from "@/lib/precio";
import { etiquetasPorCuenta } from "@/lib/ubicaciones";

/** YYYY-MM-DD, siempre en UTC para no desfasar un día por zona horaria. */
function formatearFecha(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return formatearFecha(d);
}

export type PresetRango = "hoy" | "semana" | "mes" | "personalizado";

/** Resuelve desde/hasta a partir de un preset, anclado a la fecha operativa de hoy. */
export function resolverRangoFechas(
  preset: PresetRango,
  hoyOperativo: string,
  desdePersonalizado?: string,
  hastaPersonalizado?: string
): { desde: string; hasta: string } {
  if (preset === "personalizado" && desdePersonalizado && hastaPersonalizado) {
    return { desde: desdePersonalizado, hasta: hastaPersonalizado };
  }
  if (preset === "semana") {
    const d = new Date(`${hoyOperativo}T00:00:00Z`);
    const diaSemana = d.getUTCDay(); // 0=domingo
    const offsetLunes = diaSemana === 0 ? 6 : diaSemana - 1;
    return { desde: sumarDias(hoyOperativo, -offsetLunes), hasta: hoyOperativo };
  }
  if (preset === "mes") {
    return { desde: `${hoyOperativo.slice(0, 7)}-01`, hasta: hoyOperativo };
  }
  return { desde: hoyOperativo, hasta: hoyOperativo };
}

export interface VentaPorDia {
  fecha: string;
  resumen: ResumenCaja;
}

export interface ProductoReporte {
  nombre: string;
  cantidad: number;
  total: number;
}

export interface VentaPorMesero {
  nombre: string;
  total: number;
  cuentas: number;
}

export interface VentaPorUbicacion {
  etiqueta: string;
  total: number;
}

export interface GastoPorCategoria {
  nombre: string;
  total: number;
}

export interface Anulacion {
  fecha: string;
  producto: string;
  cantidad: number;
  motivo: string | null;
  anuladoPor: string;
}

export interface CierreJornada {
  fecha: string;
  baseCajaInicial: number;
  efectivoContado: number | null;
  diferenciaCaja: number | null;
  cerradoPor: string | null;
}

export interface FiadoPendiente {
  cliente: string;
  telefono: string | null;
  saldo: number;
}

export interface ReportesData {
  ventasPorDia: VentaPorDia[];
  totalPeriodo: ResumenCaja;
  productosTop: ProductoReporte[];
  productosMenos: ProductoReporte[];
  ventasPorMesero: VentaPorMesero[];
  ventasPorUbicacion: VentaPorUbicacion[];
  costoTotal: number;
  utilidadEstimada: number;
  gastosPorCategoria: GastoPorCategoria[];
  anulaciones: Anulacion[];
  historicoCierres: CierreJornada[];
  fiadosPendientes: FiadoPendiente[];
}

const RESUMEN_VACIO_PERIODO: ResumenCaja = {
  efectivo: 0,
  transferencia: 0,
  fiado: 0,
  gastos: 0,
  total: 0,
  cantidadPagos: 0,
};

/**
 * Arma todos los datos de reportería (sección 9 del alcance) para el rango
 * [desde, hasta] (fechas operativas, inclusive). Una sola función porque
 * casi todos los reportes parten de la misma base (jornadas -> cuentas ->
 * subcuentas -> pedido_items) y calcularla una vez evita repetir consultas.
 */
export async function construirReportes(
  sedeId: string,
  desde: string,
  hasta: string
): Promise<ReportesData> {
  const supabase = await createClient();

  const { data: jornadas } = await supabase
    .from("jornadas")
    .select("id, fecha_operativa, estado, base_caja_inicial, efectivo_contado, diferencia_caja, usuario_cierre_id")
    .eq("sede_id", sedeId)
    .gte("fecha_operativa", desde)
    .lte("fecha_operativa", hasta)
    .order("fecha_operativa");

  const jornadaIds = (jornadas ?? []).map((j) => j.id);

  if (!jornadaIds.length) {
    return {
      ventasPorDia: [],
      totalPeriodo: RESUMEN_VACIO_PERIODO,
      productosTop: [],
      productosMenos: [],
      ventasPorMesero: [],
      ventasPorUbicacion: [],
      costoTotal: 0,
      utilidadEstimada: 0,
      gastosPorCategoria: [],
      anulaciones: [],
      historicoCierres: [],
      fiadosPendientes: await obtenerFiadosPendientes(sedeId),
    };
  }

  const { data: cuentas } = await supabase
    .from("cuentas")
    .select("id, tipo, creado_por, jornada_id")
    .in("jornada_id", jornadaIds);
  const cuentaIds = (cuentas ?? []).map((c) => c.id);

  const [{ data: subcuentas }, etiquetasPorCuentaId, { data: gastos }, { data: gastosCategorias }] =
    await Promise.all([
      cuentaIds.length
        ? supabase.from("subcuentas").select("id, cuenta_id").in("cuenta_id", cuentaIds)
        : Promise.resolve({ data: [] as { id: string; cuenta_id: string }[] }),
      etiquetasPorCuenta(cuentaIds),
      supabase
        .from("gastos")
        .select("monto, categoria_id, created_at")
        .in("jornada_id", jornadaIds),
      supabase.from("gastos_categorias").select("id, nombre").eq("sede_id", sedeId),
    ]);

  const subcuentaIds = (subcuentas ?? []).map((s) => s.id);
  const cuentaIdPorSubcuenta = new Map((subcuentas ?? []).map((s) => [s.id, s.cuenta_id]));

  const { data: items } = subcuentaIds.length
    ? await supabase
        .from("pedido_items")
        .select(
          "producto_id, cantidad, precio_unitario, precio_modificador, anulado, motivo_anulacion, anulado_por, subcuenta_id, created_at"
        )
        .in("subcuenta_id", subcuentaIds)
    : {
        data: [] as {
          producto_id: string;
          cantidad: number;
          precio_unitario: number;
          precio_modificador: number | null;
          anulado: boolean;
          motivo_anulacion: string | null;
          anulado_por: string | null;
          subcuenta_id: string;
          created_at: string;
        }[],
      };

  const productoIds = [...new Set((items ?? []).map((i) => i.producto_id))];
  const meseraIds = [...new Set((cuentas ?? []).map((c) => c.creado_por))];
  const anuladorIds = [
    ...new Set((items ?? []).map((i) => i.anulado_por).filter((id): id is string => Boolean(id))),
  ];
  const usuarioIds = [...new Set([...meseraIds, ...anuladorIds])];

  const [{ data: productos }, { data: usuarios }] = await Promise.all([
    productoIds.length
      ? supabase.from("productos").select("id, nombre, costo_promedio").in("id", productoIds)
      : Promise.resolve({ data: [] as { id: string; nombre: string; costo_promedio: number }[] }),
    usuarioIds.length
      ? supabase.from("usuarios").select("id, nombre").in("id", usuarioIds)
      : Promise.resolve({ data: [] as { id: string; nombre: string }[] }),
  ]);

  const nombrePorProducto = new Map((productos ?? []).map((p) => [p.id, p.nombre]));
  const costoPorProducto = new Map((productos ?? []).map((p) => [p.id, p.costo_promedio]));
  const nombrePorUsuario = new Map((usuarios ?? []).map((u) => [u.id, u.nombre]));
  const nombrePorCategoriaGasto = new Map((gastosCategorias ?? []).map((c) => [c.id, c.nombre]));
  const cuentaPorId = new Map((cuentas ?? []).map((c) => [c.id, c]));

  // --- productos ---
  const acumProducto = new Map<string, { cantidad: number; total: number }>();
  let costoTotal = 0;
  for (const item of items ?? []) {
    if (item.anulado) continue;
    const actual = acumProducto.get(item.producto_id) ?? { cantidad: 0, total: 0 };
    actual.cantidad += item.cantidad;
    actual.total += calcularTotalItem(item);
    acumProducto.set(item.producto_id, actual);
    costoTotal += (costoPorProducto.get(item.producto_id) ?? 0) * item.cantidad;
  }
  const listaProductos: ProductoReporte[] = [...acumProducto.entries()].map(([id, v]) => ({
    nombre: nombrePorProducto.get(id) ?? "Producto",
    cantidad: v.cantidad,
    total: v.total,
  }));
  const productosTop = [...listaProductos].sort((a, b) => b.cantidad - a.cantidad).slice(0, 10);
  const productosMenos = [...listaProductos].sort((a, b) => a.cantidad - b.cantidad).slice(0, 10);

  // --- ventas por mesero ---
  const acumMesero = new Map<string, { total: number; cuentas: Set<string> }>();
  for (const item of items ?? []) {
    if (item.anulado) continue;
    const cuentaId = cuentaIdPorSubcuenta.get(item.subcuenta_id);
    const cuenta = cuentaId ? cuentaPorId.get(cuentaId) : undefined;
    if (!cuenta) continue;
    const actual = acumMesero.get(cuenta.creado_por) ?? { total: 0, cuentas: new Set<string>() };
    actual.total += calcularTotalItem(item);
    actual.cuentas.add(cuenta.id);
    acumMesero.set(cuenta.creado_por, actual);
  }
  const ventasPorMesero: VentaPorMesero[] = [...acumMesero.entries()]
    .map(([id, v]) => ({
      nombre: nombrePorUsuario.get(id) ?? "Mesera",
      total: v.total,
      cuentas: v.cuentas.size,
    }))
    .sort((a, b) => b.total - a.total);

  // --- ventas por mesa/silla ---
  const acumUbicacion = new Map<string, number>();
  for (const item of items ?? []) {
    if (item.anulado) continue;
    const cuentaId = cuentaIdPorSubcuenta.get(item.subcuenta_id);
    if (!cuentaId) continue;
    const etiqueta = etiquetasPorCuentaId.get(cuentaId) ?? "Cuenta";
    acumUbicacion.set(etiqueta, (acumUbicacion.get(etiqueta) ?? 0) + calcularTotalItem(item));
  }
  const ventasPorUbicacion: VentaPorUbicacion[] = [...acumUbicacion.entries()]
    .map(([etiqueta, total]) => ({ etiqueta, total }))
    .sort((a, b) => b.total - a.total);

  // --- gastos por categoria ---
  const acumGastoCategoria = new Map<string, number>();
  for (const g of gastos ?? []) {
    const nombre = g.categoria_id ? (nombrePorCategoriaGasto.get(g.categoria_id) ?? "Sin categoría") : "Sin categoría";
    acumGastoCategoria.set(nombre, (acumGastoCategoria.get(nombre) ?? 0) + g.monto);
  }
  const gastosPorCategoria: GastoPorCategoria[] = [...acumGastoCategoria.entries()]
    .map(([nombre, total]) => ({ nombre, total }))
    .sort((a, b) => b.total - a.total);

  // --- anulaciones ---
  const anulaciones: Anulacion[] = (items ?? [])
    .filter((i) => i.anulado)
    .map((i) => ({
      fecha: i.created_at,
      producto: nombrePorProducto.get(i.producto_id) ?? "Producto",
      cantidad: i.cantidad,
      motivo: i.motivo_anulacion,
      anuladoPor: i.anulado_por ? (nombrePorUsuario.get(i.anulado_por) ?? "—") : "—",
    }))
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));

  // --- ventas por dia + total del periodo ---
  const resumenesPorJornada = await Promise.all(
    (jornadas ?? []).map(async (j) => ({
      fecha: j.fecha_operativa,
      resumen: await calcularResumenCaja(j.id),
    }))
  );
  const totalPeriodo = resumenesPorJornada.reduce(
    (acc, r) => ({
      efectivo: acc.efectivo + r.resumen.efectivo,
      transferencia: acc.transferencia + r.resumen.transferencia,
      fiado: acc.fiado + r.resumen.fiado,
      gastos: acc.gastos + r.resumen.gastos,
      total: acc.total + r.resumen.total,
      cantidadPagos: acc.cantidadPagos + r.resumen.cantidadPagos,
    }),
    { ...RESUMEN_VACIO_PERIODO }
  );

  const utilidadEstimada = totalPeriodo.total - costoTotal - totalPeriodo.gastos;

  // --- historico de cierres ---
  const historicoCierres: CierreJornada[] = (jornadas ?? [])
    .filter((j) => j.estado === "cerrada")
    .map((j) => ({
      fecha: j.fecha_operativa,
      baseCajaInicial: j.base_caja_inicial,
      efectivoContado: j.efectivo_contado,
      diferenciaCaja: j.diferencia_caja,
      cerradoPor: j.usuario_cierre_id ? (nombrePorUsuario.get(j.usuario_cierre_id) ?? null) : null,
    }))
    .reverse();

  return {
    ventasPorDia: resumenesPorJornada,
    totalPeriodo,
    productosTop,
    productosMenos,
    ventasPorMesero,
    ventasPorUbicacion,
    costoTotal,
    utilidadEstimada,
    gastosPorCategoria,
    anulaciones,
    historicoCierres,
    fiadosPendientes: await obtenerFiadosPendientes(sedeId),
  };
}

/** Snapshot de saldos pendientes de fiado -- no es por rango, es "a hoy". */
async function obtenerFiadosPendientes(sedeId: string): Promise<FiadoPendiente[]> {
  const supabase = await createClient();

  const { data: clientes } = await supabase
    .from("clientes_fiado")
    .select("id, nombre, telefono")
    .eq("sede_id", sedeId);
  const clienteIds = (clientes ?? []).map((c) => c.id);
  if (!clienteIds.length) return [];

  const { data: fiados } = await supabase
    .from("fiados")
    .select("cliente_fiado_id, monto_total, monto_pagado")
    .in("cliente_fiado_id", clienteIds)
    .neq("estado", "pagado");

  const clientePorId = new Map(clientes?.map((c) => [c.id, c]));
  const saldoPorCliente = new Map<string, number>();
  for (const f of fiados ?? []) {
    saldoPorCliente.set(
      f.cliente_fiado_id,
      (saldoPorCliente.get(f.cliente_fiado_id) ?? 0) + (f.monto_total - f.monto_pagado)
    );
  }

  return [...saldoPorCliente.entries()]
    .map(([clienteId, saldo]) => {
      const cliente = clientePorId.get(clienteId);
      return { cliente: cliente?.nombre ?? "Cliente", telefono: cliente?.telefono ?? null, saldo };
    })
    .sort((a, b) => b.saldo - a.saldo);
}
