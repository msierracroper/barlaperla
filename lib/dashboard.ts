import "server-only";

import { createClient } from "@/lib/supabase/server";
import { obtenerJornadaActiva } from "@/lib/jornada";
import { calcularResumenCaja, type ResumenCaja } from "@/lib/caja";

export interface ProductoTop {
  nombre: string;
  cantidad: number;
}

export interface AlertasInventario {
  agotados: number;
  bajos: number;
}

export interface ResumenDashboard {
  fechaOperativa: string;
  resumen: ResumenCaja;
  ubicacionesOcupadas: { mesas: number; barras: number };
  fiadosPendientes: { monto: number; cantidad: number };
  topProductos: ProductoTop[];
  alertasInventario: AlertasInventario;
  utilidadEstimada: number;
  totalSemanaAnterior: number | null;
}

/**
 * Agrupa todos los indicadores del "Resumen del día" del admin (sección 10
 * del alcance) en una sola función -- son varias consultas independientes,
 * pero todas se resuelven contra la misma jornada operativa de hoy.
 */
export async function obtenerResumenDashboard(sedeId: string): Promise<ResumenDashboard> {
  const supabase = await createClient();
  const jornada = await obtenerJornadaActiva(sedeId);

  const [resumen, { data: cuentasAbiertas }, { data: cuentasJornada }] = await Promise.all([
    calcularResumenCaja(jornada.id),
    supabase
      .from("cuentas")
      .select("tipo")
      .eq("sede_id", sedeId)
      .eq("estado", "abierta"),
    supabase.from("cuentas").select("id").eq("jornada_id", jornada.id),
  ]);

  const ubicacionesOcupadas = { mesas: 0, barras: 0 };
  for (const c of cuentasAbiertas ?? []) {
    if (c.tipo === "mesa") ubicacionesOcupadas.mesas += 1;
    else ubicacionesOcupadas.barras += 1;
  }

  const cuentaIds = (cuentasJornada ?? []).map((c) => c.id);
  const { data: subcuentas } = cuentaIds.length
    ? await supabase.from("subcuentas").select("id").in("cuenta_id", cuentaIds)
    : { data: [] as { id: string }[] };
  const subcuentaIds = (subcuentas ?? []).map((s) => s.id);

  const { data: items } = subcuentaIds.length
    ? await supabase
        .from("pedido_items")
        .select("producto_id, cantidad, precio_unitario, precio_modificador, anulado")
        .in("subcuenta_id", subcuentaIds)
    : {
        data: [] as {
          producto_id: string;
          cantidad: number;
          precio_unitario: number;
          precio_modificador: number | null;
          anulado: boolean;
        }[],
      };

  const itemsVendidos = (items ?? []).filter((i) => !i.anulado);
  const productoIds = [...new Set(itemsVendidos.map((i) => i.producto_id))];

  const { data: productos } = productoIds.length
    ? await supabase
        .from("productos")
        .select("id, nombre, costo_promedio")
        .in("id", productoIds)
    : { data: [] as { id: string; nombre: string; costo_promedio: number }[] };

  const productoPorId = new Map((productos ?? []).map((p) => [p.id, p]));

  const cantidadPorProducto = new Map<string, number>();
  let costoTotal = 0;
  for (const item of itemsVendidos) {
    cantidadPorProducto.set(
      item.producto_id,
      (cantidadPorProducto.get(item.producto_id) ?? 0) + item.cantidad
    );
    const producto = productoPorId.get(item.producto_id);
    if (producto) costoTotal += producto.costo_promedio * item.cantidad;
  }

  const topProductos: ProductoTop[] = [...cantidadPorProducto.entries()]
    .map(([productoId, cantidad]) => ({
      nombre: productoPorId.get(productoId)?.nombre ?? "Producto",
      cantidad,
    }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 5);

  // fiados pendientes
  const { data: clientesFiado } = await supabase
    .from("clientes_fiado")
    .select("id")
    .eq("sede_id", sedeId);
  const clienteIds = (clientesFiado ?? []).map((c) => c.id);
  const { data: fiadosPendientesData } = clienteIds.length
    ? await supabase
        .from("fiados")
        .select("monto_total, monto_pagado")
        .in("cliente_fiado_id", clienteIds)
        .neq("estado", "pagado")
    : { data: [] as { monto_total: number; monto_pagado: number }[] };
  const fiadosPendientes = (fiadosPendientesData ?? []).reduce(
    (acc, f) => ({
      monto: acc.monto + (f.monto_total - f.monto_pagado),
      cantidad: acc.cantidad + 1,
    }),
    { monto: 0, cantidad: 0 }
  );

  // alertas de inventario (productos simple/licor con stock <= minimo o en 0)
  const { data: productosControlados } = await supabase
    .from("productos")
    .select("id, control_inventario, stock_minimo")
    .eq("sede_id", sedeId)
    .eq("activo", true)
    .in("control_inventario", ["simple", "licor_multiuso"]);

  const idsControlados = (productosControlados ?? []).map((p) => p.id);
  const [{ data: stocksSimple }, { data: botellasCerradas }] = await Promise.all([
    idsControlados.length
      ? supabase
          .from("stock_simple")
          .select("producto_id, cantidad_actual")
          .in("producto_id", idsControlados)
      : Promise.resolve({ data: [] as { producto_id: string; cantidad_actual: number }[] }),
    idsControlados.length
      ? supabase
          .from("botellas")
          .select("producto_id")
          .in("producto_id", idsControlados)
          .eq("estado", "cerrada")
      : Promise.resolve({ data: [] as { producto_id: string }[] }),
  ]);
  const stockPorProducto = new Map((stocksSimple ?? []).map((s) => [s.producto_id, s.cantidad_actual]));
  const cerradasPorProducto = new Map<string, number>();
  for (const b of botellasCerradas ?? []) {
    cerradasPorProducto.set(b.producto_id, (cerradasPorProducto.get(b.producto_id) ?? 0) + 1);
  }

  const alertasInventario: AlertasInventario = { agotados: 0, bajos: 0 };
  for (const p of productosControlados ?? []) {
    const stock =
      p.control_inventario === "simple"
        ? (stockPorProducto.get(p.id) ?? 0)
        : (cerradasPorProducto.get(p.id) ?? 0);
    const minimo = p.stock_minimo ?? 0;
    if (stock <= 0) alertasInventario.agotados += 1;
    else if (minimo > 0 && stock <= minimo) alertasInventario.bajos += 1;
  }

  // utilidad estimada: venta total (incluye fiado, ya facturado) - costo - gastos
  const utilidadEstimada = resumen.total - costoTotal - resumen.gastos;

  // comparativo con el mismo dia de la semana anterior
  const fechaAnterior = new Date(jornada.fecha_operativa);
  fechaAnterior.setDate(fechaAnterior.getDate() - 7);
  const fechaAnteriorStr = fechaAnterior.toISOString().slice(0, 10);

  const { data: jornadaAnterior } = await supabase
    .from("jornadas")
    .select("id")
    .eq("sede_id", sedeId)
    .eq("fecha_operativa", fechaAnteriorStr)
    .maybeSingle();

  const totalSemanaAnterior = jornadaAnterior
    ? (await calcularResumenCaja(jornadaAnterior.id)).total
    : null;

  return {
    fechaOperativa: jornada.fecha_operativa,
    resumen,
    ubicacionesOcupadas,
    fiadosPendientes,
    topProductos,
    alertasInventario,
    utilidadEstimada,
    totalSemanaAnterior,
  };
}
