"use client";

import type { InputHTMLAttributes } from "react";

function soloDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

export function formatearMiles(digitos: string): string {
  if (!digitos) return "";
  return Number(digitos).toLocaleString("es-CO");
}

/**
 * Input de dinero con separador de miles en vivo ("100.000" en vez de
 * "100000"), para que sea más difícil digitar un cero de más por error.
 * El estado que maneja el padre son los dígitos crudos (sin puntos); el
 * formateo es solo visual, se recalcula en cada tecla.
 */
export function MoneyInput({
  value,
  onChange,
  className,
  ...props
}: {
  value: string;
  onChange: (digitos: string) => void;
  className?: string;
} & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
>) {
  return (
    <input
      type="text"
      inputMode="numeric"
      value={formatearMiles(value)}
      onChange={(e) => onChange(soloDigitos(e.target.value))}
      className={className}
      {...props}
    />
  );
}
