export default function Card({ className = '', children }) {
  return (
    <section
      className={`bg-[var(--card)] border border-[var(--line)] rounded-2xl shadow-[0_16px_40px_rgba(21,29,43,0.08)] ${className}`.trim()}
    >
      {children}
    </section>
  );
}
