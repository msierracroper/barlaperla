"use client";

export function Switch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50 ${
        checked
          ? "bg-perla-cian shadow-[0_0_12px_-1px_rgba(54,224,214,0.7)]"
          : "bg-white/15"
      }`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}
