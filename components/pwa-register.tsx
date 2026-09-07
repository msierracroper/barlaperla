"use client";

import { useEffect } from "react";

/**
 * Registra el service worker minimo (sin cache, ver public/sw.js) para que
 * el navegador considere la app instalable como PWA. Vive en el layout raiz
 * para cubrir las 4 areas (mesera/preparador son las que de verdad se
 * instalan en celular, segun el alcance; cajero/admin siguen siendo acceso
 * web normal, pero no hace daño que tambien puedan instalarla).
 */
export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // instalacion de PWA es un extra, no algo critico -- si falla
        // (navegador sin soporte, etc.) la app sigue funcionando normal.
      });
    }
  }, []);

  return null;
}
