import { goTo } from '../../router';

const LINKS = [
  { key: 'dashboard', label: 'My Tests', path: '/dashboard' },
  { key: 'report', label: 'Reports', path: '/report' },
];

export default function StudentLayout({ routePage, children }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)] gap-4 items-start">
      <aside className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-3 sticky top-4">
        <div className="px-2 py-2 mb-2">
          <p className="m-0 text-[0.72rem] tracking-[0.12em] uppercase text-[var(--muted)]">Student Workspace</p>
          <h3 className="m-0 mt-1 text-[1.05rem]">Navigation</h3>
        </div>

        <nav className="grid gap-1.5">
          {LINKS.map((link) => {
            const isActive =
              (routePage === 'dashboard' && link.key === 'dashboard') ||
              (routePage === 'test' && link.key === 'dashboard') ||
              (routePage === 'report' && link.key === 'report');

            return (
              <button
                key={link.key}
                type="button"
                onClick={() => goTo(link.path)}
                className={isActive ? 'menu-item active text-left' : 'menu-item text-left'}
              >
                {link.label}
              </button>
            );
          })}
          
        </nav>
      </aside>

      <section className="min-w-0">{children}</section>
    </div>
  );
}
