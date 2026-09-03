interface ItemConModificador {
  producto_id: string;
  modificador_id: string | null;
}

/**
 * Etiqueta legible de un pedido_item ("Cerveza" o "Cerveza + Michelada").
 * Centralizado porque mesera, preparador y cajero muestran esta misma
 * combinacion producto+modificador cada uno a su manera.
 */
export function etiquetaPedidoItem(
  item: ItemConModificador,
  nombrePorProducto: Map<string, string>,
  nombrePorModificador: Map<string, string>
): string {
  const nombreProducto = nombrePorProducto.get(item.producto_id) ?? "Producto";
  if (!item.modificador_id) return nombreProducto;

  const nombreModificador = nombrePorModificador.get(item.modificador_id);
  return nombreModificador
    ? `${nombreProducto} + ${nombreModificador}`
    : nombreProducto;
}
