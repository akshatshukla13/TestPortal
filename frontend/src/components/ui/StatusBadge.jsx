export default function StatusBadge({ children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-[var(--line)] px-2.5 py-1 text-[0.7rem] font-bold tracking-[0.04em] uppercase ${className}`.trim()}
    >
      {children}
    </span>
  );
}
