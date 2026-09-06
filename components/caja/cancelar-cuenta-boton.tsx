"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelarCuenta } from "@/app/caja/cuentas/[cuentaId]/actions";
import { inputClass, buttonDangerClass } from "@/components/ui/form-controls";

export function CancelarCuentaBoton({ cuentaId }: { cuentaId: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirmar() {
    setError(null);
    startTransition(async () => {
      try {
        await cancelarCuenta(cuentaId, motivo);
        // Sin ruta fija: este boton se usa tanto desde /caja como desde
        // /admin/pedidos, asi que se queda en la misma pantalla (que ya
        // muestra "cuenta cancelada" al refrescar) en vez de redirigir a
        // un sitio que solo tiene sentido para uno de los dos contextos.
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "No se pudo cancelar la cuenta."
        );
      }
    });
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className={buttonDangerClass}
      >
        Cancelar cuenta completa (sin cobrar)
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
      <p className="text-sm text-white/80">
        Esto anula todos los items y cierra la cuenta sin registrar ningún
        pago. Solo úsalo si el cliente se va sin consumir nada.
      </p>
      <input
        autoFocus
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Motivo (obligatorio)"
        className={`${inputClass} mt-3 w-full`}
      />
      {error && (
        <p className="mt-2 text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={confirmar}
          disabled={pending || !motivo.trim()}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
        >
          {pending ? "Cancelando..." : "Confirmar cancelación"}
        </button>
        <button
          type="button"
          onClick={() => {
            setAbierto(false);
            setError(null);
          }}
          className="text-sm text-white/60 hover:text-white"
        >
          Volver
        </button>
      </div>
    </div>
  );
}
