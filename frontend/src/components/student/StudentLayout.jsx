import { useState } from 'react';
import { goTo } from '../../router';

const PAGE_TITLES = {
  dashboard: 'My Tests',
  test: 'Exam',
  report: 'Test Report',
  bookmarks: 'Bookmarks',
  documents: 'Documents',
  video: 'Video Lectures',
  'current-affairs': 'Current Affairs',
  announcements: 'Announcements',
};

const NAV_ITEMS = [
  {
    key: 'dashboard',
    label: 'My Tests',
    icon: '📝',
    path: '/dashboard',
    expandable: true,
    children: [
      { key: 'chem', label: 'Chemical Engineering', path: '/dashboard' },
      { key: 'comp', label: 'Computer Engineering', path: '/dashboard' },
    ],
  },
  { key: 'report', label: 'Reports', icon: '📊', path: '/report' },
  { key: 'bookmarks', label: 'Bookmarks', icon: '🔖', path: '/bookmarks' },
  {
    key: 'documents',
    label: 'Documents',
    icon: '📄',
    expandable: true,
    children: [
      { key: 'notes', label: 'Notes', path: '/documents' },
      { key: 'pdfs', label: 'PDFs', path: '/documents' },
    ],
  },
  {
    key: 'video',
    label: 'Video',
    icon: '🎥',
    expandable: true,
    children: [
      { key: 'lectures', label: 'Topic-wise Lectures', path: '/video' },
    ],
  },
  { key: 'current-affairs', label: 'Current Affairs', icon: '📰', path: '/current-affairs' },
  { key: 'announcements', label: 'Announcements', icon: '📢', path: '/announcements' },
];

function NavItem({ item, routePage }) {
  const isActive =
    routePage === item.key ||
    (routePage === 'test' && item.key === 'dashboard');
  const [open, setOpen] = useState(isActive && item.expandable);

  if (item.expandable) {
    return (
      <div>
        <button
          type="button"
          className={`menu-item text-left w-full flex items-center justify-between${isActive ? ' active' : ''}`}
          onClick={() => setOpen((o) => !o)}
        >
          <span className="flex items-center gap-2">
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </span>
          <span className="text-[0.7rem] opacity-60">{open ? '▲' : '▼'}</span>
        </button>
        {open && (
          <div className="ml-4 mt-1 grid gap-1">
            {item.children.map((child) => (
              <button
                key={child.key}
                type="button"
                className="menu-item text-left text-[0.88rem] text-[var(--muted)]"
                onClick={() => goTo(child.path)}
              >
                {child.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`menu-item text-left flex items-center gap-2${isActive ? ' active' : ''}`}
      onClick={() => goTo(item.path)}
    >
      <span>{item.icon}</span>
      <span>{item.label}</span>
    </button>
  );
}

export default function StudentLayout({ routePage, user, onLogout, children }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);

  const pageTitle = PAGE_TITLES[routePage] || 'Dashboard';

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Top Navbar ───────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-[var(--card)] border-b border-[var(--line)] shadow-sm flex items-center gap-3 px-4 py-2.5">
        {/* Logo */}
        <button
          type="button"
          className="secondary flex items-center gap-2 border-none px-0 py-0 bg-transparent shadow-none"
          onClick={() => goTo('/dashboard')}
        >
          <span className="text-[1.6rem] leading-none">🎓</span>
          <span className="font-bold text-[1rem] tracking-tight hidden sm:block">TestPortal</span>
        </button>

        <div className="w-px h-6 bg-[var(--line)] mx-1 hidden sm:block" />

        {/* Page title */}
        <h2 className="m-0 text-[1rem] font-bold flex-1 truncate hidden md:block">{pageTitle}</h2>

        {/* Search */}
        <div className="relative flex-1 max-w-[280px]">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] text-sm">🔍</span>
          <input
            type="search"
            placeholder="Search tests…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-[0.4rem] text-sm rounded-xl"
          />
        </div>

        {/* Icon buttons */}
        <button
          type="button"
          className="secondary text-[1.1rem] px-[0.55rem] py-[0.38rem] rounded-full"
          title="Notifications"
        >
          🔔
        </button>
        <button
          type="button"
          className="secondary text-[1.1rem] px-[0.55rem] py-[0.38rem] rounded-full"
          title="Help"
          onClick={() => goTo('/announcements')}
        >
          ❓
        </button>

        {/* User avatar dropdown */}
        {user && (
          <div className="relative">
            <button
              type="button"
              className="secondary flex items-center gap-2 px-2.5 py-1.5 rounded-xl"
              onClick={() => setShowUserMenu((s) => !s)}
            >
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#2740c8] text-white text-xs font-bold uppercase">
                {user.name?.[0] || '?'}
              </span>
              <span className="text-xs font-semibold max-w-[100px] truncate hidden sm:block">{user.name}</span>
              <span className="text-[0.65rem] opacity-50">▼</span>
            </button>
            {showUserMenu && (
              <div
                className="absolute right-0 top-full mt-1 bg-[var(--card)] border border-[var(--line)] rounded-xl shadow-lg p-2 min-w-[160px] z-50"
              >
                <p className="m-0 px-2 py-1 text-xs text-[var(--muted)] truncate">{user.email}</p>
                <p className="m-0 px-2 py-1 text-xs font-bold uppercase tracking-wide">{user.role}</p>
                <hr className="border-[var(--line)] my-1" />
                <button
                  type="button"
                  className="secondary w-full text-left text-sm px-2 py-1.5 rounded-lg"
                  onClick={() => { setShowUserMenu(false); onLogout?.(); }}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* ── Body: sidebar + content ──────────────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-[220px] shrink-0 bg-[var(--card)] border-r border-[var(--line)] sticky top-[52px] self-start h-[calc(100vh-52px)] overflow-y-auto p-3 hidden md:block">
          <div className="px-2 py-2 mb-2">
            <p className="m-0 text-[0.7rem] tracking-[0.12em] uppercase text-[var(--muted)]">Navigation</p>
          </div>
          <nav className="grid gap-1">
            {NAV_ITEMS.map((item) => (
              <NavItem key={item.key} item={item} routePage={routePage} />
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 p-4 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
