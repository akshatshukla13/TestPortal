import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import AdminDashboard from './AdminDashboard';
import TestList from './TestList';
import TestEditor from './TestEditor';
import QuestionBankPage from './QuestionBankPage';

function getErrorMessage(err) {
  return err?.message || 'Something went wrong. Please try again.';
}

function ToastViewport({ toasts, onDismiss }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 2000,
        display: 'grid',
        gap: '0.5rem',
        width: 'min(90vw, 360px)',
      }}
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => {
        const styleByType = {
          success: { background: '#ecfdf3', border: '1px solid #86efac', color: '#14532d' },
          error: { background: '#fff1f2', border: '1px solid #fda4af', color: '#881337' },
          info: { background: '#eff6ff', border: '1px solid #93c5fd', color: '#1e3a8a' },
        };

        return (
          <div
            key={toast.id}
            role="status"
            style={{
              ...styleByType[toast.type],
              borderRadius: '12px',
              padding: '0.65rem 0.75rem',
              boxShadow: '0 16px 32px rgba(15, 23, 42, 0.15)',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '0.6rem',
            }}
          >
            <p className="m-0 text-sm font-semibold" style={{ lineHeight: 1.35 }}>{toast.text}</p>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => onDismiss(toast.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                padding: 0,
                fontWeight: 700,
                cursor: 'pointer',
                lineHeight: 1,
              }}
            >
              x
            </button>
          </div>
        );
      })}
    </div>
  );
}

function makeDefaultNewTest() {
  const now = Date.now();
  return {
    title: '',
    tags: 'gate, cs, mock',
    durationMinutes: 180,
    totalMarks: 100,
    category: 'full-mock',
    difficultyLevel: 'Mixed',
    startTime: new Date(now + 10 * 60 * 1000).toISOString().slice(0, 16),
    endTime: new Date(now + 4 * 60 * 60 * 1000).toISOString().slice(0, 16),
    isApproved: false,
  };
}

// Simple create-test form (shown when view === 'create')
function CreateTestForm({ token, notifySuccess, notifyError, onCreated, onCancel }) {
  const [form, setForm] = useState(makeDefaultNewTest);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await api.createTest(token, {
        title: form.title,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        durationMinutes: Number(form.durationMinutes),
        totalMarks: Number(form.totalMarks),
        category: form.category,
        difficultyLevel: form.difficultyLevel,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        isApproved: form.isApproved,
        questions: [],
      });
      notifySuccess('Test created successfully.');
      onCreated(data.test?._id || data._id);
    } catch (err) {
      notifyError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3">
        <button type="button" className="secondary" onClick={onCancel} disabled={saving}>← Back</button>
        <h2 className="m-0">Create New Test</h2>
      </div>
      <article className="bg-white border border-[var(--line)] rounded-2xl p-4 shadow-[0_16px_40px_rgba(21,29,43,0.08)]">
        <form className="grid gap-3" onSubmit={handleSubmit}>
          <label>
            Title
            <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
          </label>
          <label>
            Tags (comma separated)
            <input value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label>
              Category
              <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>
                <option value="full-mock">Full Mock</option>
                <option value="subject-wise">Subject Wise</option>
                <option value="topic-wise">Topic Wise</option>
                <option value="pyq">PYQ</option>
              </select>
            </label>
            <label>
              Difficulty
              <select value={form.difficultyLevel} onChange={(e) => setForm((p) => ({ ...p, difficultyLevel: e.target.value }))}>
                <option value="Easy">Easy</option>
                <option value="Moderate">Moderate</option>
                <option value="Hard">Hard</option>
                <option value="Mixed">Mixed</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label>
              Duration (min)
              <input type="number" value={form.durationMinutes} onChange={(e) => setForm((p) => ({ ...p, durationMinutes: e.target.value }))} />
            </label>
            <label>
              Total Marks
              <input type="number" value={form.totalMarks} onChange={(e) => setForm((p) => ({ ...p, totalMarks: e.target.value }))} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label>
              Start Time
              <input type="datetime-local" value={form.startTime} onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))} />
            </label>
            <label>
              End Time
              <input type="datetime-local" value={form.endTime} onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))} />
            </label>
          </div>
          <label className="flex items-center gap-2" style={{ fontWeight: 400 }}>
            <input type="checkbox" checked={form.isApproved} onChange={(e) => setForm((p) => ({ ...p, isApproved: e.target.checked }))} />
            Approve immediately
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create Test'}</button>
            <button type="button" className="secondary" onClick={onCancel} disabled={saving}>Cancel</button>
          </div>
        </form>
      </article>
    </div>
  );
}

export default function AdminPage({ token, setMessage, onLogout }) {
  const [view, setView] = useState('dashboard'); // 'dashboard' | 'tests' | 'create' | 'editor' | 'bank'
  const [editingTestId, setEditingTestId] = useState(null);
  const [tests, setTests] = useState([]);
  const [testsLoading, setTestsLoading] = useState(false);
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((type, text) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3600);
  }, []);

  const notifyError = useCallback((text) => {
    notify('error', text);
    setMessage(text);
  }, [notify, setMessage]);

  const notifySuccess = useCallback((text) => {
    notify('success', text);
    setMessage('');
  }, [notify, setMessage]);

  const notifyInfo = useCallback((text) => {
    notify('info', text);
    setMessage('');
  }, [notify, setMessage]);

  const toastApi = useMemo(() => ({ notifySuccess, notifyError, notifyInfo }), [notifySuccess, notifyError, notifyInfo]);

  const loadTests = useCallback(async ({ forceRefresh = false } = {}) => {
    setTestsLoading(true);
    try {
      const data = await api.getAllTests(token, { forceRefresh });
      setTests(data.tests || []);
    } catch (err) {
      notifyError(getErrorMessage(err));
    } finally {
      setTestsLoading(false);
    }
  }, [token, notifyError]);

  useEffect(() => {
    if (view === 'bank' && tests.length === 0 && !testsLoading) {
      loadTests();
    }
  }, [view, tests.length, testsLoading, loadTests]);

  function handleNavigate(target) {
    if (target === 'tests-new') {
      setView('create');
    } else if (target === 'bank') {
      setView('bank');
    } else if (target === 'tests') {
      setView('tests');
    } else if (target === 'dashboard') {
      setView('dashboard');
    }
  }

  const navItems = [
    { key: 'dashboard', label: '🏠 Dashboard' },
    { key: 'tests', label: '🗂 Tests' },
    { key: 'bank', label: '📚 Question Bank' },
  ];

  const activeNavKey = view === 'editor' || view === 'create' ? 'tests' : view;

  return (
    <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
      {/* Sidebar */}
      <aside
        style={{
          width: 200,
          flexShrink: 0,
          position: 'sticky',
          top: '1rem',
        }}
        className="bg-white border border-[var(--line)] rounded-2xl p-3 shadow-[0_16px_40px_rgba(21,29,43,0.08)]"
      >
        <p className="m-0 mb-3 font-semibold text-sm text-[var(--muted)] px-2">Admin Panel</p>
        <nav className="grid gap-1">
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`section-tab bg-[var(--card)] text-[var(--ink)] border border-[var(--line)] rounded-lg py-[0.38rem] px-[0.8rem] font-semibold text-sm cursor-pointer text-left${activeNavKey === item.key ? ' active' : ''}`}
              style={{ width: '100%', textAlign: 'left' }}
              onClick={() => {
                setView(item.key);
                setEditingTestId(null);
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
        {onLogout && (
          <div style={{ marginTop: '1rem', borderTop: '1px solid var(--line)', paddingTop: '0.75rem' }}>
            <button
              type="button"
              className="secondary"
              style={{ width: '100%', textAlign: 'left' }}
              onClick={onLogout}
            >
              🚪 Logout
            </button>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, minWidth: 0 }}>
        {view === 'dashboard' && (
          <AdminDashboard token={token} onNavigate={handleNavigate} {...toastApi} />
        )}
        {view === 'tests' && (
          <TestList
            token={token}
            {...toastApi}
            onEditTest={(id) => { setEditingTestId(id); setView('editor'); }}
            onCreateNew={() => setView('create')}
          />
        )}
        {view === 'create' && (
          <CreateTestForm
            token={token}
            notifySuccess={notifySuccess}
            notifyError={notifyError}
            onCreated={(newTestId) => {
              loadTests({ forceRefresh: true });
              if (newTestId) { setEditingTestId(newTestId); setView('editor'); }
              else setView('tests');
            }}
            onCancel={() => setView('tests')}
          />
        )}
        {view === 'editor' && editingTestId && (
          <TestEditor
            token={token}
            {...toastApi}
            testId={editingTestId}
            onBack={() => { setView('tests'); setEditingTestId(null); }}
          />
        )}
        {view === 'bank' && (
          <QuestionBankPage token={token} tests={tests} testsLoading={testsLoading} {...toastApi} />
        )}
      </main>
    </div>
  );
}
