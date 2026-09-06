"use client";

import { useTransition } from "react";
import { marcarListoPorSubcuenta } from "@/app/cocina/actions";
import { buttonPrimaryClass } from "@/components/ui/form-controls";

export function MarcarListoBoton({ subcuentaId }: { subcuentaId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await marcarListoPorSubcuenta(subcuentaId);
        })
      }
      className={`${buttonPrimaryClass} text-xs`}
    >
      {pending ? "Marcando..." : "Marcar todo listo"}
    </button>
  );
}
