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
    <section className="report-shell">
      <aside className="report-sidebar">
        <div className="brand">Exam Forge</div>
        <nav>
          <button type="button" className="menu-item" onClick={() => goTo('/dashboard')}>
            My Test
          </button>
          <button type="button" className="menu-item active">
            Report
          </button>
          <button type="button" className="menu-item" onClick={() => goTo('/dashboard')}>
            Bookmarks
          </button>
          <button type="button" className="menu-item" onClick={() => goTo('/dashboard')}>
            Documents
          </button>
          <button type="button" className="menu-item" onClick={() => goTo('/dashboard')}>
            Video
          </button>
        </nav>
      </aside>

      <div className="report-main">
        <header className="report-header">
          <h2>{testName || title}</h2>
          <label className="report-select">
            Attempt
            <select value={testId} onChange={(e) => onChangeTest(e.target.value)}>
              {attempts.map((a) => (
                <option key={a._id} value={a.test?._id || ''}>
                  {a.test?.title} | {a.score}
                </option>
              ))}
            </select>
          </label>
        </header>

        <div className="report-tabs">
          {TABS.map((item) => (
            <button
              type="button"
              key={item.key}
              className={`tab-btn ${tab === item.key ? 'active' : ''}`}
              onClick={() => goTo(`/report/${item.key}/${testId}`)}
              onAuxClick={() => openInNewTab(`/report/${item.key}/${testId}`)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="report-content">{children}</div>
      </div>
    </section>
  );
}
