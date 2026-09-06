import "server-only";

import { createClient } from "@/lib/supabase/server";
import { obtenerTamanoShotMl } from "@/lib/parametros";
import type { ControlInventarioTipo } from "@/types/database.types";

/**
 * Adjunta `stockDisponible` a una lista de productos, interpretado segun su
 * tipo de control:
 *  - 'simple': unidades en stock_simple.
 *  - 'licor_multiuso': botellas 'cerrada' disponibles (venta directa).
 *  - 'shot_de_licor': shots que alcanzan con el ml restante de la botella
 *    'abierta_shots' del licor_base_id (floor(ml / tamano_shot_ml)).
 *  - 'receta': cocteles que alcanzan a preparar (el minimo entre todos sus
 *    ingredientes, floor(ml restante 'abierta_coctel' / ml de la receta));
 *    `null` si la receta todavia no tiene ingredientes configurados.
 * `null` para la UI de la mesera significa "sin límite por ahora".
 */
export async function adjuntarStock<
  T extends {
    id: string;
    control_inventario: ControlInventarioTipo;
    licor_base_id?: string | null;
  },
>(
  productos: T[],
  sedeId: string | null
): Promise<(T & { stockDisponible: number | null })[]> {
  const supabase = await createClient();

  const idsSimples = productos
    .filter((p) => p.control_inventario === "simple")
    .map((p) => p.id);
  const idsLicor = productos
    .filter((p) => p.control_inventario === "licor_multiuso")
    .map((p) => p.id);
  const idsLicorBaseDeShots = [
    ...new Set(
      productos
        .filter((p) => p.control_inventario === "shot_de_licor" && p.licor_base_id)
        .map((p) => p.licor_base_id as string)
    ),
  ];
  const idsRecetas = productos
    .filter((p) => p.control_inventario === "receta")
    .map((p) => p.id);

  const [
    { data: stocks },
    { data: botellasCerradas },
    { data: botellasAbiertas },
    { data: recetas },
  ] = await Promise.all([
    idsSimples.length
      ? supabase
          .from("stock_simple")
          .select("producto_id, cantidad_actual")
          .in("producto_id", idsSimples)
      : Promise.resolve({ data: [] as { producto_id: string; cantidad_actual: number }[] }),
    idsLicor.length
      ? supabase
          .from("botellas")
          .select("producto_id")
          .in("producto_id", idsLicor)
          .eq("estado", "cerrada")
      : Promise.resolve({ data: [] as { producto_id: string }[] }),
    idsLicorBaseDeShots.length
      ? supabase
          .from("botellas")
          .select("producto_id, volumen_ml_restante")
          .in("producto_id", idsLicorBaseDeShots)
          .eq("estado", "abierta_shots")
      : Promise.resolve({ data: [] as { producto_id: string; volumen_ml_restante: number }[] }),
    idsRecetas.length
      ? supabase
          .from("recetas_coctel")
          .select("producto_coctel_id, producto_ingrediente_id, cantidad_ml")
          .in("producto_coctel_id", idsRecetas)
      : Promise.resolve({
          data: [] as {
            producto_coctel_id: string;
            producto_ingrediente_id: string;
            cantidad_ml: number;
          }[],
        }),
  ]);

  const stockPorProducto = new Map(
    (stocks ?? []).map((s) => [s.producto_id, s.cantidad_actual])
  );

  const cerradasPorProducto = new Map<string, number>();
  for (const b of botellasCerradas ?? []) {
    cerradasPorProducto.set(b.producto_id, (cerradasPorProducto.get(b.producto_id) ?? 0) + 1);
  }

  // Solo se espera una botella 'abierta_shots'/'abierta_coctel' a la vez por
  // licor -- si hubiera mas de una (no debería pasar), esto se queda con la primera.
  const mlAbiertaPorLicor = new Map<string, number>();
  for (const b of botellasAbiertas ?? []) {
    if (!mlAbiertaPorLicor.has(b.producto_id)) {
      mlAbiertaPorLicor.set(b.producto_id, b.volumen_ml_restante);
    }
  }

  let tamanoShotMl: number | null = null;
  if (idsLicorBaseDeShots.length) {
    tamanoShotMl = sedeId ? await obtenerTamanoShotMl(sedeId) : 45;
  }

  const ingredienteIds = [...new Set((recetas ?? []).map((r) => r.producto_ingrediente_id))];
  const { data: botellasCoctel } = ingredienteIds.length
    ? await supabase
        .from("botellas")
        .select("producto_id, volumen_ml_restante")
        .in("producto_id", ingredienteIds)
        .eq("estado", "abierta_coctel")
    : { data: [] as { producto_id: string; volumen_ml_restante: number }[] };

  const mlCoctelPorIngrediente = new Map<string, number>();
  for (const b of botellasCoctel ?? []) {
    if (!mlCoctelPorIngrediente.has(b.producto_id)) {
      mlCoctelPorIngrediente.set(b.producto_id, b.volumen_ml_restante);
    }
  }

  const recetasPorCoctel = new Map<string, { producto_ingrediente_id: string; cantidad_ml: number }[]>();
  for (const r of recetas ?? []) {
    const lista = recetasPorCoctel.get(r.producto_coctel_id) ?? [];
    lista.push({ producto_ingrediente_id: r.producto_ingrediente_id, cantidad_ml: r.cantidad_ml });
    recetasPorCoctel.set(r.producto_coctel_id, lista);
  }

  return productos.map((p) => {
    if (p.control_inventario === "simple") {
      return { ...p, stockDisponible: stockPorProducto.get(p.id) ?? 0 };
    }
    if (p.control_inventario === "licor_multiuso") {
      return { ...p, stockDisponible: cerradasPorProducto.get(p.id) ?? 0 };
    }
    if (p.control_inventario === "shot_de_licor" && p.licor_base_id) {
      const mlDisponible = mlAbiertaPorLicor.get(p.licor_base_id) ?? 0;
      const shotsDisponibles = tamanoShotMl
        ? Math.floor(mlDisponible / tamanoShotMl)
        : 0;
      return { ...p, stockDisponible: shotsDisponibles };
    }
    if (p.control_inventario === "receta") {
      const ingredientes = recetasPorCoctel.get(p.id);
      if (!ingredientes?.length) return { ...p, stockDisponible: null };
      const cocteles = ingredientes.map((ing) => {
        const mlDisponible = mlCoctelPorIngrediente.get(ing.producto_ingrediente_id) ?? 0;
        return ing.cantidad_ml > 0 ? Math.floor(mlDisponible / ing.cantidad_ml) : 0;
      });
      return { ...p, stockDisponible: Math.min(...cocteles) };
    }
    return { ...p, stockDisponible: null };
  });
}

interface ItemVenta {
  productoId: string;
  cantidad: number;
}

interface ItemVentaConId extends ItemVenta {
  pedidoItemId: string;
}

interface InfoProducto {
  id: string;
  nombre: string;
  sede_id: string;
  control_inventario: ControlInventarioTipo;
  licor_base_id: string | null;
}

async function obtenerInfoProductos(productoIds: string[]): Promise<InfoProducto[]> {
  if (!productoIds.length) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("productos")
    .select("id, nombre, sede_id, control_inventario, licor_base_id")
    .in("id", productoIds);
  return data ?? [];
}

function sumarPorClave<K extends string>(
  items: ItemVenta[],
  clavePorProductoId: Map<string, K>
): Map<K, number> {
  const resultado = new Map<K, number>();
  for (const item of items) {
    const clave = clavePorProductoId.get(item.productoId);
    if (!clave) continue;
    resultado.set(clave, (resultado.get(clave) ?? 0) + item.cantidad);
  }
  return resultado;
}

/**
 * Rechaza el pedido completo si algún producto 'simple' (stock en
 * unidades), 'licor_multiuso' (botellas 'cerrada') o 'shot_de_licor' (ml de
 * la botella 'abierta_shots' del licor base) no tiene disponibilidad
 * suficiente. Se llama ANTES de insertar los pedido_items -- rechazo total,
 * no parcial. 'receta' todavia no se valida (siguiente paso de Fase 3).
 */
export async function validarStockDisponible(items: ItemVenta[]): Promise<void> {
  const productoIds = [...new Set(items.map((i) => i.productoId))];
  if (!productoIds.length) return;

  const productos = await obtenerInfoProductos(productoIds);
  if (!productos.length) return;

  const supabase = await createClient();
  const nombrePorId = new Map(productos.map((p) => [p.id, p.nombre]));

  // --- simple ---
  const simples = productos.filter((p) => p.control_inventario === "simple");
  if (simples.length) {
    const { data: stocks } = await supabase
      .from("stock_simple")
      .select("producto_id, cantidad_actual")
      .in("producto_id", simples.map((p) => p.id));
    const stockPorProducto = new Map((stocks ?? []).map((s) => [s.producto_id, s.cantidad_actual]));
    const solicitado = sumarPorClave(items, new Map(simples.map((p) => [p.id, p.id])));
    for (const p of simples) {
      const disponible = stockPorProducto.get(p.id) ?? 0;
      const pedido = solicitado.get(p.id) ?? 0;
      if (pedido > disponible) {
        throw new Error(`No hay suficiente stock de "${p.nombre}" (disponible: ${disponible}).`);
      }
    }
  }

  // --- licor_multiuso (venta directa de botella) ---
  const licores = productos.filter((p) => p.control_inventario === "licor_multiuso");
  if (licores.length) {
    const { data: botellas } = await supabase
      .from("botellas")
      .select("producto_id")
      .in("producto_id", licores.map((p) => p.id))
      .eq("estado", "cerrada");
    const disponiblesPorProducto = new Map<string, number>();
    for (const b of botellas ?? []) {
      disponiblesPorProducto.set(b.producto_id, (disponiblesPorProducto.get(b.producto_id) ?? 0) + 1);
    }
    const solicitado = sumarPorClave(items, new Map(licores.map((p) => [p.id, p.id])));
    for (const p of licores) {
      const disponible = disponiblesPorProducto.get(p.id) ?? 0;
      const pedido = solicitado.get(p.id) ?? 0;
      if (pedido > disponible) {
        throw new Error(
          `No hay suficientes botellas de "${p.nombre}" (disponibles: ${disponible}).`
        );
      }
    }
  }

  // --- shot_de_licor ---
  const shots = productos.filter(
    (p) => p.control_inventario === "shot_de_licor" && p.licor_base_id
  );
  if (shots.length) {
    const licorBaseIds = [...new Set(shots.map((p) => p.licor_base_id as string))];
    const { data: botellas } = await supabase
      .from("botellas")
      .select("producto_id, volumen_ml_restante")
      .in("producto_id", licorBaseIds)
      .eq("estado", "abierta_shots");
    const mlPorLicor = new Map<string, number>();
    for (const b of botellas ?? []) {
      if (!mlPorLicor.has(b.producto_id)) mlPorLicor.set(b.producto_id, b.volumen_ml_restante);
    }

    const sedeId = shots[0].sede_id;
    const tamanoShotMl = await obtenerTamanoShotMl(sedeId);
    const solicitadoShots = sumarPorClave(
      items,
      new Map(shots.map((p) => [p.id, p.id]))
    );

    // agrupar shots solicitados por licor base (varios productos "shot" podrían compartir licor base)
    const mlSolicitadoPorLicor = new Map<string, number>();
    for (const p of shots) {
      const cantidadShots = solicitadoShots.get(p.id) ?? 0;
      if (!cantidadShots) continue;
      const licorId = p.licor_base_id as string;
      mlSolicitadoPorLicor.set(
        licorId,
        (mlSolicitadoPorLicor.get(licorId) ?? 0) + cantidadShots * tamanoShotMl
      );
    }

    for (const [licorId, mlNecesarios] of mlSolicitadoPorLicor) {
      const mlDisponible = mlPorLicor.get(licorId) ?? 0;
      if (mlNecesarios > mlDisponible) {
        const nombreLicor = nombrePorId.get(licorId) ?? "licor";
        throw new Error(
          `No hay suficiente volumen abierto de "${nombreLicor}" para esos shots (disponible: ${mlDisponible}ml).`
        );
      }
    }
  }

  // --- receta (coctel) ---
  const cocteles = productos.filter((p) => p.control_inventario === "receta");
  if (cocteles.length) {
    const { data: recetas } = await supabase
      .from("recetas_coctel")
      .select("producto_coctel_id, producto_ingrediente_id, cantidad_ml")
      .in("producto_coctel_id", cocteles.map((p) => p.id));

    const ingredienteIds = [...new Set((recetas ?? []).map((r) => r.producto_ingrediente_id))];
    const nombreIngredientePorId = new Map(
      (await obtenerInfoProductos(ingredienteIds)).map((p) => [p.id, p.nombre])
    );

    const { data: botellasCoctel } = ingredienteIds.length
      ? await supabase
          .from("botellas")
          .select("producto_id, volumen_ml_restante")
          .in("producto_id", ingredienteIds)
          .eq("estado", "abierta_coctel")
      : { data: [] as { producto_id: string; volumen_ml_restante: number }[] };
    const mlPorIngrediente = new Map<string, number>();
    for (const b of botellasCoctel ?? []) {
      if (!mlPorIngrediente.has(b.producto_id)) mlPorIngrediente.set(b.producto_id, b.volumen_ml_restante);
    }

    const solicitadoCocteles = sumarPorClave(items, new Map(cocteles.map((p) => [p.id, p.id])));

    const mlNecesarioPorIngrediente = new Map<string, number>();
    for (const r of recetas ?? []) {
      const cantidadPedida = solicitadoCocteles.get(r.producto_coctel_id) ?? 0;
      if (!cantidadPedida) continue;
      mlNecesarioPorIngrediente.set(
        r.producto_ingrediente_id,
        (mlNecesarioPorIngrediente.get(r.producto_ingrediente_id) ?? 0) +
          cantidadPedida * r.cantidad_ml
      );
    }

    for (const [ingredienteId, mlNecesario] of mlNecesarioPorIngrediente) {
      const mlDisponible = mlPorIngrediente.get(ingredienteId) ?? 0;
      if (mlNecesario > mlDisponible) {
        const nombreIngrediente = nombreIngredientePorId.get(ingredienteId) ?? "un ingrediente";
        throw new Error(
          `No hay suficiente "${nombreIngrediente}" abierto para cóctel (disponible: ${mlDisponible}ml).`
        );
      }
    }
  }
}

/**
 * Descuenta el inventario correspondiente ya con el id real del
 * pedido_item (por eso se llama DESPUES de insertarlos, para trazabilidad).
 * Ignora en silencio 'receta' (siguiente paso).
 */
export async function descontarStockVendido(items: ItemVentaConId[]): Promise<void> {
  const productoIds = [...new Set(items.map((i) => i.productoId))];
  if (!productoIds.length) return;

  const productos = await obtenerInfoProductos(productoIds);
  const infoPorId = new Map(productos.map((p) => [p.id, p]));
  const supabase = await createClient();

  for (const item of items) {
    const info = infoPorId.get(item.productoId);
    if (!info) continue;

    if (info.control_inventario === "simple") {
      const { error } = await supabase.rpc("registrar_movimiento_stock_simple", {
        p_producto_id: item.productoId,
        p_delta: -item.cantidad,
        p_tipo: "venta",
        p_referencia_id: item.pedidoItemId,
      });
      if (error) throw new Error(`No se pudo actualizar el inventario: ${error.message}`);
    } else if (info.control_inventario === "licor_multiuso") {
      const { error } = await supabase.rpc("vender_botella_completa", {
        p_producto_id: item.productoId,
        p_cantidad: Math.round(item.cantidad),
        p_referencia_id: item.pedidoItemId,
      });
      if (error) throw new Error(`No se pudo actualizar el inventario: ${error.message}`);
    } else if (info.control_inventario === "shot_de_licor" && info.licor_base_id) {
      const tamanoShotMl = await obtenerTamanoShotMl(info.sede_id);
      const { error } = await supabase.rpc("vender_shot", {
        p_licor_base_id: info.licor_base_id,
        p_ml: item.cantidad * tamanoShotMl,
        p_referencia_id: item.pedidoItemId,
      });
      if (error) throw new Error(`No se pudo actualizar el inventario: ${error.message}`);
    } else if (info.control_inventario === "receta") {
      const { error } = await supabase.rpc("vender_coctel", {
        p_producto_coctel_id: item.productoId,
        p_cantidad: Math.round(item.cantidad),
        p_referencia_id: item.pedidoItemId,
      });
      if (error) throw new Error(`No se pudo actualizar el inventario: ${error.message}`);
    }
  }
}

/**
 * Repone el inventario cuando se anula un item ya vendido. Simetrico a
 * descontarStockVendido.
 */
export async function reponerStockAnulado(items: ItemVentaConId[]): Promise<void> {
  const productoIds = [...new Set(items.map((i) => i.productoId))];
  if (!productoIds.length) return;

  const productos = await obtenerInfoProductos(productoIds);
  const infoPorId = new Map(productos.map((p) => [p.id, p]));
  const supabase = await createClient();

  for (const item of items) {
    const info = infoPorId.get(item.productoId);
    if (!info) continue;

    if (info.control_inventario === "simple") {
      const { error } = await supabase.rpc("registrar_movimiento_stock_simple", {
        p_producto_id: item.productoId,
        p_delta: item.cantidad,
        p_tipo: "anulacion",
        p_referencia_id: item.pedidoItemId,
      });
      if (error) throw new Error(`No se pudo actualizar el inventario: ${error.message}`);
    } else if (info.control_inventario === "licor_multiuso") {
      const { error } = await supabase.rpc("reponer_botella_completa", {
        p_referencia_id: item.pedidoItemId,
      });
      if (error) throw new Error(`No se pudo actualizar el inventario: ${error.message}`);
    } else if (info.control_inventario === "shot_de_licor") {
      const { error } = await supabase.rpc("reponer_shot", {
        p_referencia_id: item.pedidoItemId,
      });
      if (error) throw new Error(`No se pudo actualizar el inventario: ${error.message}`);
    } else if (info.control_inventario === "receta") {
      const { error } = await supabase.rpc("reponer_coctel", {
        p_referencia_id: item.pedidoItemId,
      });
      if (error) throw new Error(`No se pudo actualizar el inventario: ${error.message}`);
    }
  }
}
