import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import { formatDateTime } from '../../utils/format';

function getTestStatus(test) {
  const now = new Date();
  if (!test.isApproved) return 'inactive';
  if (new Date(test.startTime) > now) return 'upcoming';
  if (new Date(test.endTime) < now) return 'expired';
  return 'active';
}

const STATUS_STYLES = {
  active:   { background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' },
  inactive: { background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb' },
  upcoming: { background: '#dbeafe', color: '#1d4ed8', border: '1px solid #bfdbfe' },
  expired:  { background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' },
};

const STATUS_FILTERS = ['All', 'active', 'inactive', 'upcoming', 'expired'];

export default function TestList({ token, setMessage, onEditTest, onCreateNew }) {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const loadTests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAllTests(token);
      setTests(data.tests || []);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, setMessage]);

  useEffect(() => { loadTests(); }, [loadTests]);

  const filtered = useMemo(() => {
    return tests.filter((t) => {
      const matchSearch = t.title.toLowerCase().includes(search.toLowerCase());
      const status = getTestStatus(t);
      const matchStatus = statusFilter === 'All' || status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [tests, search, statusFilter]);

  async function handleDuplicate(e, testId) {
    e.stopPropagation();
    try {
      await api.duplicateTest(token, testId);
      setMessage('Test duplicated.');
      loadTests();
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function handleDelete(e, testId) {
    e.stopPropagation();
    if (!window.confirm('Delete this test? This cannot be undone.')) return;
    try {
      await api.deleteTest(token, testId);
      setMessage('Test deleted.');
      loadTests();
    } catch (err) {
      setMessage(err.message);
    }
  }

  return (
    <div className="grid gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="m-0">Tests</h2>
        <button type="button" onClick={onCreateNew}>＋ Create Test</button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[var(--line)] rounded-2xl p-4 shadow-[0_16px_40px_rgba(21,29,43,0.08)]">
        <div className="flex gap-3 flex-wrap items-end">
          <label style={{ flex: 1, minWidth: 200 }}>
            Search
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title…"
            />
          </label>
          <div className="flex gap-1.5 flex-wrap">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                type="button"
                className={`section-tab bg-[var(--card)] text-[var(--ink)] border border-[var(--line)] rounded-lg py-[0.38rem] px-[0.8rem] font-semibold text-sm cursor-pointer${statusFilter === s ? ' active' : ''}`}
                onClick={() => setStatusFilter(s)}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <p className="text-[var(--muted)]">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-[var(--muted)]">No tests found.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.75rem' }}>
          {filtered.map((test) => {
            const status = getTestStatus(test);
            return (
              <div
                key={test._id}
                className="bg-white border border-[var(--line)] rounded-2xl shadow-[0_16px_40px_rgba(21,29,43,0.08)] flex flex-col"
                style={{ cursor: 'pointer' }}
                onClick={() => onEditTest(test._id)}
              >
                {/* Card body */}
                <div className="p-4 flex flex-col gap-2 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="m-0 text-base font-semibold leading-snug">{test.title}</h3>
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap"
                      style={STATUS_STYLES[status]}
                    >
                      {status}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {test.category && (
                      <span className="inline-flex items-center rounded-full border border-[var(--line)] px-1.5 py-0.5 text-xs bg-[var(--card-soft)]">
                        {test.category}
                      </span>
                    )}
                    {test.difficultyLevel && (
                      <span className="inline-flex items-center rounded-full border border-[var(--line)] px-1.5 py-0.5 text-xs bg-[var(--card-soft)]">
                        {test.difficultyLevel}
                      </span>
                    )}
                  </div>

                  <div className="text-sm text-[var(--muted)] grid gap-0.5">
                    <span>⏱ {test.durationMinutes} min &nbsp;·&nbsp; 📝 {test.totalMarks} marks</span>
                    <span>❓ {test.questions?.length ?? 0} questions</span>
                    <span>🕐 Start: {formatDateTime(test.startTime)}</span>
                    <span>🕑 End: {formatDateTime(test.endTime)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div
                  className="flex gap-2 px-4 pb-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => onEditTest(test._id)}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={(e) => handleDuplicate(e, test._id)}
                  >
                    📋 Duplicate
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    style={{ color: '#dc2626' }}
                    onClick={(e) => handleDelete(e, test._id)}
                  >
                    🗑 Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
