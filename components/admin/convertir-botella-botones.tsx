"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { convertirBotella } from "@/app/admin/inventario/actions";
import { buttonSecondaryClass } from "@/components/ui/form-controls";

export function ConvertirBotellaBotones({
  productoId,
  hayCerradas,
}: {
  productoId: string;
  hayCerradas: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function convertir(destino: "abierta_shots" | "abierta_coctel") {
    setError(null);
    startTransition(async () => {
      try {
        await convertirBotella(productoId, destino);
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "No se pudo convertir la botella."
        );
      }
    });
  }

  if (!hayCerradas) return null;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => convertir("abierta_shots")}
          disabled={pending}
          className={`${buttonSecondaryClass} flex-1`}
        >
          Abrir para shots
        </button>
        <button
          type="button"
          onClick={() => convertir("abierta_coctel")}
          disabled={pending}
          className={`${buttonSecondaryClass} flex-1`}
        >
          Abrir para cóctel
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
