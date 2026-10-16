export const inputClass =
  "rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-white outline-none backdrop-blur-xl transition focus:border-perla-dorado focus:ring-2 focus:ring-perla-dorado/25";

export const selectClass = inputClass;

/** CTA principal: degradado magenta→naranja con brillo, como el letrero del bar. */
export const buttonPrimaryClass =
  "rounded-full bg-gradient-to-br from-perla-magenta to-perla-naranja px-5 py-2.5 font-semibold text-white shadow-[0_8px_22px_-8px_rgba(255,77,141,0.6)] transition hover:brightness-110 hover:shadow-[0_10px_26px_-6px_rgba(255,77,141,0.75)] disabled:opacity-60 disabled:shadow-none";

/** Botón chico para acciones secundarias en listas/filas (antes eran links de texto). */
export const buttonSecondaryClass =
  "rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur-xl transition hover:border-perla-cian/40 hover:bg-white/10 hover:text-white disabled:opacity-50";

/** Igual, pero para acciones destructivas (anular, cancelar). */
export const buttonDangerClass =
  "rounded-full border border-perla-rojo/40 bg-perla-rojo/10 px-3 py-1 text-xs font-medium text-perla-rojo backdrop-blur-xl transition hover:bg-perla-rojo/20 hover:text-white disabled:opacity-50";

/** @deprecated usar buttonSecondaryClass — se deja por compatibilidad temporal */
export const linkButtonClass = buttonSecondaryClass;
