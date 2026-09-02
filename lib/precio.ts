interface ItemConPrecio {
  cantidad: number;
  precio_unitario: number;
  precio_modificador: number | null;
  anulado: boolean;
}

/**
 * Subtotal de un pedido_item (cantidad x precio + modificador). Un item
 * anulado no cuenta. Centralizado porque el cálculo de "total de una
 * cuenta" se necesita en mesera, cajero y (mas adelante) reportería.
 */
export function calcularTotalItem(item: ItemConPrecio): number {
  if (item.anulado) return 0;
  return (
    item.cantidad * item.precio_unitario +
    item.cantidad * (item.precio_modificador ?? 0)
  );
}
