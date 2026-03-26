export default function PageHeader({ title, subtitle, right }) {
  return (
    <header className="flex flex-wrap justify-between items-start gap-4 mb-4">
      <div>
        <h2 className="m-0 text-[1.35rem]">{title}</h2>
        {subtitle && <p className="m-0 mt-1 text-sm text-[var(--muted)]">{subtitle}</p>}
      </div>
      {right ? <div className="flex items-center gap-2">{right}</div> : null}
    </header>
  );
}
