export const inputClass =
  "rounded-md border border-white/20 bg-white/5 px-3 py-2 text-white outline-none focus:border-perla-dorado";

export const selectClass = inputClass;

export const buttonPrimaryClass =
  "rounded-md bg-perla-rojo px-4 py-2 font-semibold text-white transition hover:brightness-110 disabled:opacity-60";

/** Botón chico para acciones secundarias en listas/filas (antes eran links de texto). */
export const buttonSecondaryClass =
  "rounded-md border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white disabled:opacity-50";

/** Igual, pero para acciones destructivas (anular, cancelar). */
export const buttonDangerClass =
  "rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-300 transition hover:bg-red-500/20 hover:text-red-200 disabled:opacity-50";

/** @deprecated usar buttonSecondaryClass — se deja por compatibilidad temporal */
export const linkButtonClass = buttonSecondaryClass;
