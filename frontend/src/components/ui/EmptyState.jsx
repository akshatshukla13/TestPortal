export default function EmptyState({ message }) {
  return (
    <div className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-6 text-center text-[var(--muted)]">
      {message}
    </div>
  );
}
