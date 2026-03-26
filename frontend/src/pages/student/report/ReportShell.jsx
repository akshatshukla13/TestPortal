import { goTo, openInNewTab } from '../../../router';

const TABS = [
  { key: 'score', label: 'Score Card' },
  { key: 'subject', label: 'Subject Report' },
  { key: 'solution', label: 'Solution Report' },
  { key: 'question', label: 'Question Report' },
  { key: 'compare', label: 'Compare Your Self' },
];

export default function ReportShell({ title, tab, testId, testName, onChangeTest, attempts, children }) {
  return (
    <section className="grid grid-cols-[190px_1fr] min-h-[82vh] border border-[var(--line)] rounded-2xl overflow-hidden bg-[#f3f5f8]">
      <aside className="bg-white border-r border-[var(--line)] p-3">
        <div className="font-bold mb-3.5">Exam Forge</div>
        <nav className="grid gap-[0.4rem]">
          <button type="button" className="menu-item text-left bg-white text-[var(--ink)] border border-[var(--line)] w-full" onClick={() => goTo('/dashboard')}>
            My Test
          </button>
          <button type="button" className="menu-item active text-left bg-white text-[var(--ink)] border border-[var(--line)] w-full">
            Report
          </button>
          <button type="button" className="menu-item text-left bg-white text-[var(--ink)] border border-[var(--line)] w-full" onClick={() => goTo('/dashboard')}>
            Bookmarks
          </button>
          <button type="button" className="menu-item text-left bg-white text-[var(--ink)] border border-[var(--line)] w-full" onClick={() => goTo('/dashboard')}>
            Documents
          </button>
          <button type="button" className="menu-item text-left bg-white text-[var(--ink)] border border-[var(--line)] w-full" onClick={() => goTo('/dashboard')}>
            Video
          </button>
        </nav>
      </aside>

      <div className="grid grid-rows-[auto_auto_1fr]">
        <header className="bg-[#2740c8] text-white flex justify-between items-center px-4 py-3">
          <h2 className="m-0 text-white">{testName || title}</h2>
          <label className="text-white font-semibold">
            Attempt
            <select className="min-w-[260px] text-white font-semibold" value={testId} onChange={(e) => onChangeTest(e.target.value)}>
              {attempts.map((a) => (
                <option key={a._id} value={a.test?._id || ''}>
                  {a.test?.title} | {a.score}
                </option>
              ))}
            </select>
          </label>
        </header>

        <div className="bg-[#2740c8] border-t border-white/20 px-4 pb-1.5 flex gap-2 flex-wrap">
          {TABS.map((item) => (
            <button
              type="button"
              key={item.key}
              className={`tab-btn bg-transparent border border-transparent text-[#e8edff] ${tab === item.key ? 'active' : ''}`}
              onClick={() => goTo(`/report/${item.key}/${testId}`)}
              onAuxClick={() => openInNewTab(`/report/${item.key}/${testId}`)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="p-4">{children}</div>
      </div>
    </section>
  );
}
