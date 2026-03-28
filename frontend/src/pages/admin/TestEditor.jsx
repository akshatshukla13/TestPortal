import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api';
import { buildDefaultQuestion, formatDateTime } from '../../utils/format';

// ── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const styles = {
    active:   { background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' },
    inactive: { background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb' },
    upcoming: { background: '#dbeafe', color: '#1d4ed8', border: '1px solid #bfdbfe' },
    expired:  { background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' },
  };
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={styles[status] || styles.inactive}
    >
      {status}
    </span>
  );
}

// ── Question Form (reusable inline) ──────────────────────────────────────────

function QuestionForm({ token, setMessage, initial, onSave, onCancel }) {
  const [draft, setDraft] = useState(() => initial || buildDefaultQuestion());

  async function uploadImage(file, target, index = 0) {
    if (!file) return;
    try {
      const data = await api.uploadImage(token, file);
      setDraft((prev) => {
        if (target === 'question') return { ...prev, question: { ...prev.question, image: data.imageDataUrl } };
        if (target === 'solution') return { ...prev, solution: { ...prev.solution, image: data.imageDataUrl } };
        const options = [...prev.options];
        options[index] = { ...options[index], image: data.imageDataUrl };
        return { ...prev, options };
      });
      setMessage('Image uploaded.');
    } catch (err) {
      setMessage(err.message);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave(draft);
  }

  return (
    <form className="grid gap-3" onSubmit={handleSubmit}>
      {/* Type / Subject / Topic / Difficulty / Section */}
      <div className="grid grid-cols-2 gap-2">
        <label>
          Type
          <select value={draft.type || 'MCQ'} onChange={(e) => setDraft((p) => ({ ...p, type: e.target.value }))}>
            <option value="MCQ">MCQ</option>
            <option value="MSQ">MSQ</option>
            <option value="NAT">NAT</option>
          </select>
        </label>
        <label>
          Difficulty
          <select
            value={draft.difficulty || 'Beginner'}
            onChange={(e) => setDraft((p) => ({ ...p, difficulty: e.target.value }))}
          >
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label>
          Subject
          <input
            value={draft.subject || ''}
            onChange={(e) => setDraft((p) => ({ ...p, subject: e.target.value }))}
            placeholder="e.g. Mathematics"
          />
        </label>
        <label>
          Topic
          <input
            value={draft.topic || ''}
            onChange={(e) => setDraft((p) => ({ ...p, topic: e.target.value }))}
            placeholder="e.g. Algebra"
          />
        </label>
      </div>
      <label>
        Section
        <input
          value={draft.section || ''}
          onChange={(e) => setDraft((p) => ({ ...p, section: e.target.value }))}
          placeholder="e.g. Core"
        />
      </label>

      {/* Question text + image */}
      <label>
        Question Text
        <textarea
          value={draft.question?.text || ''}
          onChange={(e) => setDraft((p) => ({ ...p, question: { ...p.question, text: e.target.value } }))}
          required
        />
      </label>
      <label>
        Question Image
        <input type="file" accept="image/*" onChange={(e) => uploadImage(e.target.files?.[0], 'question')} />
      </label>

      {/* MCQ / MSQ options */}
      {(draft.type === 'MCQ' || draft.type === 'MSQ' || !draft.type) && (
        <div className="grid grid-cols-2 gap-2.5">
          {(draft.options || []).map((opt, i) => (
            <div className="border border-[var(--line)] rounded-xl p-2.5 bg-white" key={opt.id}>
              <label>
                Option {opt.id}
                <input
                  value={opt.text}
                  onChange={(e) => {
                    const options = [...draft.options];
                    options[i] = { ...options[i], text: e.target.value };
                    setDraft((p) => ({ ...p, options }));
                  }}
                />
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => uploadImage(e.target.files?.[0], 'option', i)}
              />
              <label className="flex items-center gap-2 font-semibold" style={{ fontWeight: 400 }}>
                <input
                  type={draft.type === 'MSQ' ? 'checkbox' : 'radio'}
                  checked={opt.isCorrect}
                  onChange={() => {
                    const options = draft.options.map((item, idx) => ({
                      ...item,
                      isCorrect:
                        draft.type === 'MSQ'
                          ? idx === i ? !item.isCorrect : item.isCorrect
                          : idx === i,
                    }));
                    setDraft((p) => ({ ...p, options }));
                  }}
                />
                Correct
              </label>
            </div>
          ))}
        </div>
      )}

      {/* NAT fields */}
      {draft.type === 'NAT' && (
        <div className="grid grid-cols-2 gap-2">
          <label>
            Correct Answer
            <input
              type="number"
              value={draft.numerical?.answer ?? ''}
              onChange={(e) =>
                setDraft((p) => ({ ...p, numerical: { ...(p.numerical || {}), answer: e.target.value } }))
              }
            />
          </label>
          <label>
            Tolerance
            <input
              type="number"
              value={draft.numerical?.tolerance ?? 0}
              onChange={(e) =>
                setDraft((p) => ({ ...p, numerical: { ...(p.numerical || {}), tolerance: e.target.value } }))
              }
            />
          </label>
        </div>
      )}

      {/* Marks */}
      <div className="grid grid-cols-2 gap-2">
        <label>
          Marks (+)
          <input
            type="number"
            value={draft.marks?.total ?? 1}
            onChange={(e) => setDraft((p) => ({ ...p, marks: { ...(p.marks || {}), total: Number(e.target.value) } }))}
          />
        </label>
        <label>
          Negative Marks
          <input
            type="number"
            value={draft.marks?.negative ?? 0}
            onChange={(e) =>
              setDraft((p) => ({ ...p, marks: { ...(p.marks || {}), negative: Number(e.target.value) } }))
            }
          />
        </label>
      </div>

      {/* Solution */}
      <label>
        Solution / Explanation
        <textarea
          value={draft.solution?.text || ''}
          onChange={(e) =>
            setDraft((p) => ({ ...p, solution: { ...(p.solution || {}), text: e.target.value } }))
          }
        />
      </label>
      <label>
        Solution Image
        <input type="file" accept="image/*" onChange={(e) => uploadImage(e.target.files?.[0], 'solution')} />
      </label>

      <div className="flex gap-2">
        <button type="submit">Save Question</button>
        <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

// ── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab({ token, setMessage, test, onSaved }) {
  const [form, setForm] = useState({
    title: test.title || '',
    description: test.description || '',
    category: test.category || 'full-mock',
    difficultyLevel: test.difficultyLevel || 'Mixed',
    durationMinutes: test.durationMinutes ?? 180,
    totalMarks: test.totalMarks ?? 100,
    startTime: test.startTime ? new Date(test.startTime).toISOString().slice(0, 16) : '',
    endTime: test.endTime ? new Date(test.endTime).toISOString().slice(0, 16) : '',
    tags: Array.isArray(test.tags) ? test.tags.join(', ') : (test.tags || ''),
    isApproved: test.isApproved || false,
    sectionSwitchingAllowed: test.settings?.sectionSwitchingAllowed ?? true,
    enableFullscreen: test.settings?.enableFullscreen || false,
    trackTabSwitch: test.settings?.trackTabSwitch || false,
    disableCopyPaste: test.settings?.disableCopyPaste || false,
    disableKeyboard: test.settings?.disableKeyboard || false,
    warningThresholdMinutes: test.settings?.warningThresholdMinutes ?? 5,
  });
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        category: form.category,
        difficultyLevel: form.difficultyLevel,
        durationMinutes: Number(form.durationMinutes),
        totalMarks: Number(form.totalMarks),
        startTime: form.startTime ? new Date(form.startTime).toISOString() : undefined,
        endTime: form.endTime ? new Date(form.endTime).toISOString() : undefined,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        isApproved: form.isApproved,
        settings: {
          sectionSwitchingAllowed: form.sectionSwitchingAllowed,
          enableFullscreen: form.enableFullscreen,
          trackTabSwitch: form.trackTabSwitch,
          disableCopyPaste: form.disableCopyPaste,
          disableKeyboard: form.disableKeyboard,
          warningThresholdMinutes: Number(form.warningThresholdMinutes),
        },
      };
      await api.updateTest(token, test._id, payload);
      setMessage('Settings saved.');
      onSaved();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSave}>
      <label>
        Title
        <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
      </label>
      <label>
        Description
        <textarea
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          rows={3}
        />
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
          Duration (minutes)
          <input
            type="number"
            value={form.durationMinutes}
            onChange={(e) => setForm((p) => ({ ...p, durationMinutes: e.target.value }))}
          />
        </label>
        <label>
          Total Marks
          <input
            type="number"
            value={form.totalMarks}
            onChange={(e) => setForm((p) => ({ ...p, totalMarks: e.target.value }))}
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label>
          Start Time
          <input
            type="datetime-local"
            value={form.startTime}
            onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
          />
        </label>
        <label>
          End Time
          <input
            type="datetime-local"
            value={form.endTime}
            onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
          />
        </label>
      </div>
      <label>
        Tags (comma separated)
        <input value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} />
      </label>
      <label className="flex items-center gap-2" style={{ fontWeight: 400 }}>
        <input
          type="checkbox"
          checked={form.isApproved}
          onChange={(e) => setForm((p) => ({ ...p, isApproved: e.target.checked }))}
        />
        Published (approved)
      </label>

      {/* Advanced Settings */}
      <div className="border border-[var(--line)] rounded-xl overflow-hidden">
        <button
          type="button"
          className="secondary"
          style={{ width: '100%', textAlign: 'left', borderRadius: 0, border: 'none', padding: '0.6rem 0.9rem' }}
          onClick={() => setAdvancedOpen((v) => !v)}
        >
          {advancedOpen ? '▾' : '▸'} Advanced Settings
        </button>
        {advancedOpen && (
          <div className="p-4 grid gap-2 border-t border-[var(--line)]">
            {[
              ['sectionSwitchingAllowed', 'Allow section switching'],
              ['enableFullscreen', 'Enable fullscreen'],
              ['trackTabSwitch', 'Track tab switches'],
              ['disableCopyPaste', 'Disable copy/paste'],
              ['disableKeyboard', 'Disable keyboard shortcuts'],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2" style={{ fontWeight: 400 }}>
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.checked }))}
                />
                {label}
              </label>
            ))}
            <label>
              Warning threshold (minutes)
              <input
                type="number"
                value={form.warningThresholdMinutes}
                onChange={(e) => setForm((p) => ({ ...p, warningThresholdMinutes: e.target.value }))}
              />
            </label>
          </div>
        )}
      </div>

      <div>
        <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Settings'}</button>
      </div>
    </form>
  );
}

// ── Questions Tab ─────────────────────────────────────────────────────────────

function QuestionsTab({ token, setMessage, test, allTests, onRefresh }) {
  const [mode, setMode] = useState(null); // null | 'add' | 'edit' | 'bank' | 'copy'
  const [editingQuestion, setEditingQuestion] = useState(null);

  // Bank import state
  const [bankQuestions, setBankQuestions] = useState([]);
  const [bankSearch, setBankSearch] = useState('');
  const [bankSubject, setBankSubject] = useState('');
  const [bankType, setBankType] = useState('');
  const [selectedBankIds, setSelectedBankIds] = useState([]);

  // Copy from test state
  const [copyFromTestId, setCopyFromTestId] = useState('');
  const [copyFromTest, setCopyFromTest] = useState(null);
  const [selectedCopyIds, setSelectedCopyIds] = useState([]);

  const loadBank = useCallback(async () => {
    try {
      const params = {};
      if (bankSearch) params.search = bankSearch;
      if (bankSubject) params.subject = bankSubject;
      if (bankType) params.type = bankType;
      const data = await api.listQuestionBank(token, params);
      setBankQuestions(data.questions || []);
    } catch (err) {
      setMessage(err.message);
    }
  }, [token, bankSearch, bankSubject, bankType, setMessage]);

  useEffect(() => {
    if (mode === 'bank') loadBank();
  }, [mode, loadBank]);

  useEffect(() => {
    if (copyFromTestId) {
      const t = allTests.find((x) => x._id === copyFromTestId);
      setCopyFromTest(t || null);
      setSelectedCopyIds([]);
    }
  }, [copyFromTestId, allTests]);

  async function handleAddQuestion(draft) {
    try {
      await api.addQuestion(token, test._id, draft);
      setMessage('Question added.');
      setMode(null);
      onRefresh();
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function handleUpdateQuestion(draft) {
    try {
      await api.updateQuestion(token, test._id, editingQuestion.id, draft);
      setMessage('Question updated.');
      setMode(null);
      setEditingQuestion(null);
      onRefresh();
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function handleDeleteQuestion(questionId) {
    if (!window.confirm('Delete this question?')) return;
    try {
      await api.deleteQuestion(token, test._id, questionId);
      setMessage('Question deleted.');
      onRefresh();
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function handleAddFromBank() {
    if (!selectedBankIds.length) { setMessage('Select questions first.'); return; }
    try {
      const resp = await api.addBankQuestionsToTest(token, test._id, selectedBankIds);
      setMessage(`Added ${resp.addedCount} question(s).`);
      setSelectedBankIds([]);
      setMode(null);
      onRefresh();
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function handleCopyFromTest() {
    if (!selectedCopyIds.length) { setMessage('Select questions first.'); return; }
    try {
      await api.copyQuestions(token, test._id, { fromTestId: copyFromTestId, questionIds: selectedCopyIds });
      setMessage('Questions copied.');
      setSelectedCopyIds([]);
      setMode(null);
      onRefresh();
    } catch (err) {
      setMessage(err.message);
    }
  }

  const questions = test.questions || [];

  return (
    <div className="grid gap-4">
      {/* Action buttons */}
      {!mode && (
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={() => setMode('add')}>＋ Add New Question</button>
          <button type="button" className="secondary" onClick={() => setMode('bank')}>📚 Import from Bank</button>
          <button type="button" className="secondary" onClick={() => setMode('copy')}>📋 Copy from Another Test</button>
        </div>
      )}

      {/* Inline add/edit form */}
      {(mode === 'add' || mode === 'edit') && (
        <div className="bg-white border border-[var(--line)] rounded-2xl p-4 shadow-[0_16px_40px_rgba(21,29,43,0.08)]">
          <h3 className="m-0 mb-3">{mode === 'edit' ? 'Edit Question' : 'Add Question'}</h3>
          <QuestionForm
            token={token}
            setMessage={setMessage}
            initial={mode === 'edit' ? editingQuestion : null}
            onSave={mode === 'edit' ? handleUpdateQuestion : handleAddQuestion}
            onCancel={() => { setMode(null); setEditingQuestion(null); }}
          />
        </div>
      )}

      {/* Bank import panel */}
      {mode === 'bank' && (
        <div className="bg-white border border-[var(--line)] rounded-2xl p-4 shadow-[0_16px_40px_rgba(21,29,43,0.08)]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="m-0">Import from Question Bank</h3>
            <button type="button" className="secondary" onClick={() => { setMode(null); setSelectedBankIds([]); }}>✕ Close</button>
          </div>
          <div className="flex gap-2 flex-wrap mb-3">
            <label style={{ flex: 1, minWidth: 150 }}>
              Search
              <input value={bankSearch} onChange={(e) => setBankSearch(e.target.value)} placeholder="Search…" />
            </label>
            <label>
              Subject
              <input value={bankSubject} onChange={(e) => setBankSubject(e.target.value)} placeholder="Subject" />
            </label>
            <label>
              Type
              <select value={bankType} onChange={(e) => setBankType(e.target.value)}>
                <option value="">All</option>
                <option value="MCQ">MCQ</option>
                <option value="MSQ">MSQ</option>
                <option value="NAT">NAT</option>
              </select>
            </label>
            <div style={{ alignSelf: 'flex-end' }}>
              <button type="button" onClick={loadBank}>🔍 Search</button>
            </div>
          </div>
          <div className="grid gap-2" style={{ maxHeight: 400, overflowY: 'auto' }}>
            {bankQuestions.map((q) => (
              <label key={q._id} className="flex items-start gap-2 border border-[var(--line)] rounded-xl p-2.5 cursor-pointer" style={{ fontWeight: 400 }}>
                <input
                  type="checkbox"
                  checked={selectedBankIds.includes(q._id)}
                  onChange={() =>
                    setSelectedBankIds((prev) =>
                      prev.includes(q._id) ? prev.filter((x) => x !== q._id) : [...prev, q._id],
                    )
                  }
                />
                <div>
                  <div className="flex gap-1.5 mb-1">
                    <span className="inline-flex items-center rounded-full border border-[var(--line)] px-1.5 py-0.5 text-xs bg-[var(--card-soft)]">{q.type}</span>
                    <span className="inline-flex items-center rounded-full border border-[var(--line)] px-1.5 py-0.5 text-xs bg-[var(--card-soft)]">{q.subject}</span>
                  </div>
                  <p className="m-0 text-sm">{q.question?.text?.slice(0, 120)}{q.question?.text?.length > 120 ? '…' : ''}</p>
                </div>
              </label>
            ))}
            {bankQuestions.length === 0 && <p className="text-[var(--muted)] m-0">No questions found. Try searching.</p>}
          </div>
          <div className="flex gap-2 mt-3">
            <button type="button" onClick={handleAddFromBank} disabled={!selectedBankIds.length}>
              Add {selectedBankIds.length > 0 ? `(${selectedBankIds.length})` : ''} Selected
            </button>
          </div>
        </div>
      )}

      {/* Copy from test panel */}
      {mode === 'copy' && (
        <div className="bg-white border border-[var(--line)] rounded-2xl p-4 shadow-[0_16px_40px_rgba(21,29,43,0.08)]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="m-0">Copy from Another Test</h3>
            <button type="button" className="secondary" onClick={() => { setMode(null); setSelectedCopyIds([]); }}>✕ Close</button>
          </div>
          <label>
            Select Source Test
            <select value={copyFromTestId} onChange={(e) => setCopyFromTestId(e.target.value)}>
              <option value="">-- Select Test --</option>
              {allTests.filter((t) => t._id !== test._id).map((t) => (
                <option key={t._id} value={t._id}>{t.title} ({t.questions?.length || 0} Q)</option>
              ))}
            </select>
          </label>
          {copyFromTest && (
            <div className="grid gap-2 mt-3" style={{ maxHeight: 400, overflowY: 'auto' }}>
              {(copyFromTest.questions || []).map((q, idx) => (
                <label key={q.id || idx} className="flex items-start gap-2 border border-[var(--line)] rounded-xl p-2.5 cursor-pointer" style={{ fontWeight: 400 }}>
                  <input
                    type="checkbox"
                    checked={selectedCopyIds.includes(q.id)}
                    onChange={() =>
                      setSelectedCopyIds((prev) =>
                        prev.includes(q.id) ? prev.filter((x) => x !== q.id) : [...prev, q.id],
                      )
                    }
                  />
                  <div>
                    <span className="text-xs text-[var(--muted)]">Q{idx + 1}</span>
                    <p className="m-0 text-sm">{q.question?.text?.slice(0, 120)}{q.question?.text?.length > 120 ? '…' : ''}</p>
                  </div>
                </label>
              ))}
              {copyFromTest.questions?.length === 0 && <p className="text-[var(--muted)] m-0">No questions in this test.</p>}
            </div>
          )}
          {copyFromTest && (
            <div className="flex gap-2 mt-3">
              <button type="button" onClick={handleCopyFromTest} disabled={!selectedCopyIds.length}>
                Copy {selectedCopyIds.length > 0 ? `(${selectedCopyIds.length})` : ''} Selected
              </button>
            </div>
          )}
        </div>
      )}

      {/* Questions list */}
      <div className="bg-white border border-[var(--line)] rounded-2xl p-4 shadow-[0_16px_40px_rgba(21,29,43,0.08)]">
        <h3 className="m-0 mb-3">Questions ({questions.length})</h3>
        {questions.length === 0 ? (
          <p className="text-[var(--muted)] m-0">No questions yet. Add some above.</p>
        ) : (
          <div className="grid gap-2">
            {questions.map((q, idx) => (
              <div
                key={q.id || idx}
                className="flex items-start gap-3 border border-[var(--line)] rounded-xl p-2.5"
              >
                <span className="text-sm font-semibold text-[var(--muted)] mt-0.5 min-w-[1.5rem]">
                  {idx + 1}.
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex gap-1.5 mb-1 flex-wrap">
                    <span className="inline-flex items-center rounded-full border border-[var(--line)] px-1.5 py-0.5 text-xs bg-[var(--card-soft)]">{q.type || 'MCQ'}</span>
                    <span className="inline-flex items-center rounded-full border border-[var(--line)] px-1.5 py-0.5 text-xs bg-[var(--card-soft)]">+{q.marks?.total ?? 1}</span>
                    {q.marks?.negative > 0 && (
                      <span className="inline-flex items-center rounded-full border border-[var(--line)] px-1.5 py-0.5 text-xs" style={{ background: '#fee2e2', color: '#dc2626' }}>
                        −{q.marks.negative}
                      </span>
                    )}
                  </div>
                  <p className="m-0 text-sm text-[var(--ink)] line-clamp-2">
                    {q.question?.text?.slice(0, 80)}{q.question?.text?.length > 80 ? '…' : ''}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => { setEditingQuestion(q); setMode('edit'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    style={{ color: '#dc2626' }}
                    onClick={() => handleDeleteQuestion(q.id)}
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Access Control Tab ────────────────────────────────────────────────────────

function AccessTab({ token, setMessage, testId }) {
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadAccess = useCallback(async () => {
    setLoading(true);
    try {
      const [assignedData, usersData] = await Promise.all([
        api.getAssignedUsers(token, testId),
        api.listUsers(token),
      ]);
      const assigned = assignedData.users || assignedData.assignedUsers || [];
      setAssignedUsers(assigned);
      setAllUsers(usersData.users || []);
      setSelectedUserIds(assigned.map((u) => u._id));
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, testId, setMessage]);

  useEffect(() => { loadAccess(); }, [loadAccess]);

  async function handleSaveAccess() {
    try {
      await api.assignUsers(token, testId, selectedUserIds, 'replace');
      setMessage('Access control saved.');
      loadAccess();
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function handleAllowAll() {
    try {
      await api.assignUsers(token, testId, [], 'replace');
      setMessage('All students can now access this test.');
      loadAccess();
    } catch (err) {
      setMessage(err.message);
    }
  }

  const filteredUsers = allUsers.filter(
    (u) =>
      u.role !== 'admin' &&
      (u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email?.toLowerCase().includes(userSearch.toLowerCase())),
  );

  if (loading) return <p className="text-[var(--muted)]">Loading access control…</p>;

  return (
    <div className="grid gap-4">
      {/* Currently assigned */}
      <div className="bg-white border border-[var(--line)] rounded-2xl p-4 shadow-[0_16px_40px_rgba(21,29,43,0.08)]">
        <h3 className="m-0 mb-3">Currently Assigned</h3>
        {assignedUsers.length === 0 ? (
          <p className="text-[var(--muted)] m-0">All students can access this test.</p>
        ) : (
          <div className="grid gap-2">
            {assignedUsers.map((u) => (
              <div key={u._id} className="flex items-center justify-between border border-[var(--line)] rounded-xl px-3 py-2">
                <div>
                  <p className="m-0 font-medium text-sm">{u.name}</p>
                  <p className="m-0 text-xs text-[var(--muted)]">{u.email}</p>
                </div>
                <button
                  type="button"
                  className="secondary"
                  style={{ color: '#dc2626' }}
                  onClick={() => setSelectedUserIds((prev) => prev.filter((id) => id !== u._id))}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assign users */}
      <div className="bg-white border border-[var(--line)] rounded-2xl p-4 shadow-[0_16px_40px_rgba(21,29,43,0.08)]">
        <h3 className="m-0 mb-3">Assign Students</h3>
        <label>
          Search Students
          <input
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            placeholder="Filter by name or email…"
          />
        </label>
        <div className="grid gap-1.5 mt-2" style={{ maxHeight: 320, overflowY: 'auto' }}>
          {filteredUsers.map((u) => (
            <label key={u._id} className="flex items-center gap-2 border border-[var(--line)] rounded-xl px-3 py-2 cursor-pointer" style={{ fontWeight: 400 }}>
              <input
                type="checkbox"
                checked={selectedUserIds.includes(u._id)}
                onChange={() =>
                  setSelectedUserIds((prev) =>
                    prev.includes(u._id) ? prev.filter((x) => x !== u._id) : [...prev, u._id],
                  )
                }
              />
              <div>
                <p className="m-0 text-sm font-medium">{u.name}</p>
                <p className="m-0 text-xs text-[var(--muted)]">{u.email}</p>
              </div>
            </label>
          ))}
          {filteredUsers.length === 0 && <p className="text-[var(--muted)] m-0">No students found.</p>}
        </div>
        <div className="flex gap-2 mt-3">
          <button type="button" onClick={handleSaveAccess}>Save Access Control</button>
          <button type="button" className="secondary" onClick={handleAllowAll}>Allow All Students</button>
        </div>
      </div>
    </div>
  );
}

// ── TestEditor main ───────────────────────────────────────────────────────────

export default function TestEditor({ token, setMessage, testId, onBack }) {
  const [tab, setTab] = useState('settings'); // 'settings' | 'questions' | 'access'
  const [test, setTest] = useState(null);
  const [allTests, setAllTests] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTest = useCallback(async () => {
    try {
      const data = await api.getAllTests(token);
      const tests = data.tests || [];
      setAllTests(tests);
      const found = tests.find((t) => t._id === testId);
      if (found) setTest(found);
      else setMessage('Test not found.');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, testId, setMessage]);

  useEffect(() => { loadTest(); }, [loadTest]);

  if (loading) return <p className="text-[var(--muted)]">Loading test…</p>;
  if (!test) return <p className="text-[var(--muted)]">Test not found.</p>;

  const tabs = [
    { key: 'settings', label: '⚙️ Settings' },
    { key: 'questions', label: '❓ Questions' },
    { key: 'access', label: '🔒 Access' },
  ];

  return (
    <div className="grid gap-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button type="button" className="secondary" onClick={onBack}>← Back</button>
        <h2 className="m-0 flex-1">{test.title}</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`section-tab bg-[var(--card)] text-[var(--ink)] border border-[var(--line)] rounded-lg py-[0.38rem] px-[0.8rem] font-semibold text-sm cursor-pointer${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'settings' && (
        <SettingsTab token={token} setMessage={setMessage} test={test} onSaved={loadTest} />
      )}
      {tab === 'questions' && (
        <QuestionsTab token={token} setMessage={setMessage} test={test} allTests={allTests} onRefresh={loadTest} />
      )}
      {tab === 'access' && (
        <AccessTab token={token} setMessage={setMessage} testId={testId} />
      )}
    </div>
  );
}
