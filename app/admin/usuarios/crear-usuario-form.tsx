"use client";

import { useActionState } from "react";
import { crearUsuario, type UsuarioFormState } from "./actions";
import { inputClass, buttonPrimaryClass } from "@/components/ui/form-controls";

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "mesera", label: "Mesera" },
  { value: "preparador", label: "Preparador" },
  { value: "cajero", label: "Cajero" },
];

const initialState: UsuarioFormState = {};

export function CrearUsuarioForm() {
  const [state, formAction, pending] = useActionState(
    crearUsuario,
    initialState
  );

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          name="nombre"
          placeholder="Nombre"
          required
          className={inputClass}
        />
        <input
          name="telefono"
          placeholder="Teléfono (opcional)"
          className={inputClass}
        />
        <input
          name="email"
          type="email"
          placeholder="Correo"
          required
          className={inputClass}
        />
        <input
          name="password"
          type="password"
          placeholder="Contraseña (mín. 6 caracteres)"
          required
          minLength={6}
          className={inputClass}
        />
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-white/80">
        {ROLES.map((rol) => (
          <label key={rol.value} className="flex items-center gap-2">
            <input
              type="checkbox"
              name="roles"
              value={rol.value}
              className="accent-perla-dorado"
            />
            {rol.label}
          </label>
        ))}
      </div>

      {state.error && (
        <p className="text-sm text-red-400" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="text-sm text-perla-verde-claro">Usuario creado.</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className={`${buttonPrimaryClass} self-start`}
      >
        {pending ? "Creando..." : "Crear usuario"}
      </button>
    </form>
  );
}
