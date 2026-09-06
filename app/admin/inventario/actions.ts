"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/auth/roles";
import type { BotellaEstado } from "@/types/database.types";

/**
 * Corrige el costo_promedio de un producto directamente (ej. se digitó mal
 * el costo unitario al ingresar stock). No toca stock_simple/botellas ni
 * genera un movimiento -- es una corrección del dato, no un movimiento real
 * de inventario.
 */
export async function corregirCostoPromedio(
  productoId: string,
  nuevoCosto: number
) {
  await requireRol("admin");

  if (!Number.isFinite(nuevoCosto) || nuevoCosto < 0) {
    throw new Error("El costo no es válido.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("productos")
    .update({ costo_promedio: nuevoCosto })
    .eq("id", productoId);

  if (error) {
    throw new Error(`No se pudo corregir el costo: ${error.message}`);
  }

  revalidatePath("/admin/inventario");
}

/**
 * Ingreso de stock para productos control_inventario='simple' (cervezas,
 * aguas, enlatados...). Suma a stock_simple, recalcula costo_promedio
 * (promedio ponderado simplificado, no por lote) y deja rastro en
 * inventario_movimientos.
 */
export async function ingresarStockSimple(
  productoId: string,
  cantidad: number,
  costoUnitario: number
) {
  const usuario = await requireRol("admin");

  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    throw new Error("La cantidad no es válida.");
  }
  if (!Number.isFinite(costoUnitario) || costoUnitario < 0) {
    throw new Error("El costo unitario no es válido.");
  }

  const supabase = await createClient();

  const [{ data: producto }, { data: stock }] = await Promise.all([
    supabase
      .from("productos")
      .select("costo_promedio")
      .eq("id", productoId)
      .single(),
    supabase
      .from("stock_simple")
      .select("cantidad_actual")
      .eq("producto_id", productoId)
      .single(),
  ]);

  if (!producto || !stock) {
    throw new Error("No se encontró el producto o su stock.");
  }

  const stockAnterior = stock.cantidad_actual;
  const nuevoStock = stockAnterior + cantidad;
  const nuevoPromedio =
    (producto.costo_promedio * stockAnterior + costoUnitario * cantidad) /
    nuevoStock;

  const { error: errorStock } = await supabase
    .from("stock_simple")
    .update({ cantidad_actual: nuevoStock })
    .eq("producto_id", productoId);
  if (errorStock) {
    throw new Error(`No se pudo actualizar el stock: ${errorStock.message}`);
  }

  const { error: errorProducto } = await supabase
    .from("productos")
    .update({ costo_promedio: nuevoPromedio })
    .eq("id", productoId);
  if (errorProducto) {
    throw new Error(
      `No se pudo actualizar el costo promedio: ${errorProducto.message}`
    );
  }

  const { error: errorMov } = await supabase.from("inventario_movimientos").insert({
    producto_id: productoId,
    tipo: "ingreso",
    cantidad,
    costo_unitario: costoUnitario,
    usuario_id: usuario.id,
  });
  if (errorMov) {
    throw new Error(`No se pudo registrar el movimiento: ${errorMov.message}`);
  }

  revalidatePath("/admin/inventario");
}

/**
 * Ingreso de botellas nuevas para productos control_inventario='licor_multiuso'.
 * Cada botella se crea como fila individual (estado 'cerrada') para poder
 * rastrearla por separado cuando se convierta a shots/coctelería (Fase 3
 * siguiente paso). El costo_promedio del producto se recalcula como el
 * promedio de costo_unitario de todas las botellas no agotadas -- se
 * recomputa completo en vez de acumular, porque aquí sí tenemos el detalle
 * por unidad (a diferencia de stock_simple, que no lo guarda).
 */
export async function ingresarBotellas(
  productoId: string,
  cantidadBotellas: number,
  costoUnitario: number,
  volumenMlPorBotella: number
) {
  const usuario = await requireRol("admin");

  if (!Number.isInteger(cantidadBotellas) || cantidadBotellas <= 0) {
    throw new Error("La cantidad de botellas no es válida.");
  }
  if (!Number.isFinite(costoUnitario) || costoUnitario < 0) {
    throw new Error("El costo unitario no es válido.");
  }
  if (!Number.isFinite(volumenMlPorBotella) || volumenMlPorBotella <= 0) {
    throw new Error("El volumen de la botella no es válido.");
  }

  const supabase = await createClient();

  const nuevasBotellas = Array.from({ length: cantidadBotellas }, () => ({
    producto_id: productoId,
    estado: "cerrada" as const,
    volumen_ml_total: volumenMlPorBotella,
    volumen_ml_restante: volumenMlPorBotella,
    costo_unitario: costoUnitario,
  }));

  const { data: botellasCreadas, error: errorBotellas } = await supabase
    .from("botellas")
    .insert(nuevasBotellas)
    .select("id");
  if (errorBotellas || !botellasCreadas) {
    throw new Error(
      `No se pudieron crear las botellas: ${errorBotellas?.message ?? "sin datos"}`
    );
  }

  const movimientos = botellasCreadas.map((b) => ({
    producto_id: productoId,
    botella_id: b.id,
    tipo: "ingreso" as const,
    cantidad: 1,
    costo_unitario: costoUnitario,
    usuario_id: usuario.id,
  }));
  const { error: errorMov } = await supabase
    .from("inventario_movimientos")
    .insert(movimientos);
  if (errorMov) {
    throw new Error(`No se pudo registrar el movimiento: ${errorMov.message}`);
  }

  const { data: botellasActivas } = await supabase
    .from("botellas")
    .select("costo_unitario")
    .eq("producto_id", productoId)
    .neq("estado", "agotada");

  if (botellasActivas && botellasActivas.length) {
    const promedio =
      botellasActivas.reduce((acc, b) => acc + b.costo_unitario, 0) /
      botellasActivas.length;
    const { error: errorProducto } = await supabase
      .from("productos")
      .update({ costo_promedio: promedio })
      .eq("id", productoId);
    if (errorProducto) {
      throw new Error(
        `No se pudo actualizar el costo promedio: ${errorProducto.message}`
      );
    }
  }

  revalidatePath("/admin/inventario");
}

/**
 * Abre manualmente la botella 'cerrada' más antigua de un licor para
 * shots o coctelería (destino). No permite elegir cuál -- son unidades
 * fungibles del mismo producto, no importa cuál físicamente se abra.
 */
export async function convertirBotella(
  productoId: string,
  destino: Extract<BotellaEstado, "abierta_shots" | "abierta_coctel">
) {
  const usuario = await requireRol("admin");
  const supabase = await createClient();

  const { data: botella } = await supabase
    .from("botellas")
    .select("id")
    .eq("producto_id", productoId)
    .eq("estado", "cerrada")
    .order("fecha_ingreso", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!botella) {
    throw new Error("No hay botellas cerradas disponibles para convertir.");
  }

  const { error } = await supabase
    .from("botellas")
    .update({
      estado: destino,
      convertida_por: usuario.id,
      convertida_at: new Date().toISOString(),
    })
    .eq("id", botella.id);

  if (error) {
    throw new Error(`No se pudo convertir la botella: ${error.message}`);
  }

  revalidatePath("/admin/inventario");
}

/** Guarda el tamaño del shot (ml) configurado para la sede. */
export async function guardarTamanoShotMl(sedeId: string, ml: number) {
  await requireRol("admin");

  if (!Number.isFinite(ml) || ml <= 0) {
    throw new Error("El tamaño del shot no es válido.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("parametros_sistema").upsert(
    { sede_id: sedeId, clave: "tamano_shot_ml", valor: String(ml) },
    { onConflict: "sede_id,clave" }
  );

  if (error) {
    throw new Error(`No se pudo guardar el tamaño del shot: ${error.message}`);
  }

  revalidatePath("/admin/inventario");
}
