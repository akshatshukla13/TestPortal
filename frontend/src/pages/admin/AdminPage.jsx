import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api';
import AdminDashboard from './AdminDashboard';
import TestList from './TestList';
import TestEditor from './TestEditor';
import QuestionBankPage from './QuestionBankPage';

function makeDefaultNewTest() {
  const now = Date.now();
  return {
    title: '',
    tags: '',
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
function CreateTestForm({ token, setMessage, onCreated, onCancel }) {
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
      setMessage('Test created.');
      onCreated(data.test?._id || data._id);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3">
        <button type="button" className="secondary" onClick={onCancel}>← Back</button>
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
            <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
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

  const loadTests = useCallback(async () => {
    try {
      const data = await api.getAllTests(token);
      setTests(data.tests || []);
    } catch (err) {
      setMessage(err.message);
    }
  }, [token, setMessage]);

  useEffect(() => { loadTests(); }, [loadTests]);

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
          <AdminDashboard token={token} setMessage={setMessage} onNavigate={handleNavigate} />
        )}
        {view === 'tests' && (
          <TestList
            token={token}
            setMessage={setMessage}
            onEditTest={(id) => { setEditingTestId(id); setView('editor'); }}
            onCreateNew={() => setView('create')}
          />
        )}
        {view === 'create' && (
          <CreateTestForm
            token={token}
            setMessage={setMessage}
            onCreated={(newTestId) => {
              loadTests();
              if (newTestId) { setEditingTestId(newTestId); setView('editor'); }
              else setView('tests');
            }}
            onCancel={() => setView('tests')}
          />
        )}
        {view === 'editor' && editingTestId && (
          <TestEditor
            token={token}
            setMessage={setMessage}
            testId={editingTestId}
            onBack={() => { setView('tests'); setEditingTestId(null); }}
          />
        )}
        {view === 'bank' && (
          <QuestionBankPage token={token} setMessage={setMessage} tests={tests} />
        )}
      </main>
    </div>
  );
}
