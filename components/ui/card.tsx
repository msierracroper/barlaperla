export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  );
}
