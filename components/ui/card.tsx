export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-white/10 bg-perla-azul p-6 ${className}`}
    >
      {children}
    </div>
  );
}
