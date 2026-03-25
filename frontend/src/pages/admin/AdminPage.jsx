import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import { buildDefaultQuestion } from '../../utils/format';

const DEFAULT_BANK_Q = () => ({
  question: { text: '', image: null },
  options: [
    { id: 'A', text: '', image: null, isCorrect: false },
    { id: 'B', text: '', image: null, isCorrect: false },
    { id: 'C', text: '', image: null, isCorrect: false },
    { id: 'D', text: '', image: null, isCorrect: false },
  ],
  type: 'MCQ',
  numerical: { answer: '', tolerance: 0, min: '', max: '' },
  marks: { total: 1, negative: 0.33, partialPositive: 0 },
  solution: { text: '', image: null },
  subject: 'General',
  topic: 'Mixed',
  difficulty: 'Beginner',
  section: 'Core',
  tags: '',
});

function makeDefaultNewTest() {
  const now = Date.now();
  return {
    title: '',
    tags: 'gate, cs, mock',
    durationMinutes: 180,
    totalMarks: 100,
    startTime: new Date(now + 10 * 60 * 1000).toISOString().slice(0, 16),
    endTime: new Date(now + 4 * 60 * 60 * 1000).toISOString().slice(0, 16),
    isApproved: false,
  };
}

export default function AdminPage({ token, setMessage }) {
  const [adminTab, setAdminTab] = useState('tests'); // 'tests' | 'bank'

  // ── Tests state ──────────────────────────────────────────────────────────
  const [tests, setTests] = useState([]);
  const [selectedTestId, setSelectedTestId] = useState('');
  const [newTest, setNewTest] = useState(makeDefaultNewTest);
  const [questionDraft, setQuestionDraft] = useState(buildDefaultQuestion);

  // ── Question Bank state ───────────────────────────────────────────────────
  const [bankQuestions, setBankQuestions] = useState([]);
  const [bankTotal, setBankTotal] = useState(0);
  const [bankPage, setBankPage] = useState(1);
  const [bankFilter, setBankFilter] = useState({ subject: '', type: '', search: '' });
  const [bankDraft, setBankDraft] = useState(DEFAULT_BANK_Q);
  const [editingBankId, setEditingBankId] = useState(null);
  const [bankFormOpen, setBankFormOpen] = useState(false);
  const [selectedBankIds, setSelectedBankIds] = useState([]);
  const [addToTestId, setAddToTestId] = useState('');

  const selectedTest = useMemo(
    () => tests.find((test) => test._id === selectedTestId),
    [tests, selectedTestId],
  );

  // ── Tests ─────────────────────────────────────────────────────────────────

  const loadTests = useCallback(async () => {
    try {
      const data = await api.getAllTests(token);
      setTests(data.tests || []);
      setSelectedTestId((prev) => {
        if (!prev && data.tests?.length) return data.tests[0]._id;
        return prev;
      });
    } catch (error) {
      setMessage(error.message);
    }
  }, [token, setMessage]);

  // ── Question Bank ─────────────────────────────────────────────────────────

  const loadBank = useCallback(async () => {
    try {
      const params = { page: bankPage, limit: 30 };
      if (bankFilter.subject) params.subject = bankFilter.subject;
      if (bankFilter.type) params.type = bankFilter.type;
      if (bankFilter.search) params.search = bankFilter.search;
      const data = await api.listQuestionBank(token, params);
      setBankQuestions(data.questions || []);
      setBankTotal(data.total || 0);
    } catch (error) {
      setMessage(error.message);
    }
  }, [token, bankPage, bankFilter, setMessage]);

  useEffect(() => {
    loadTests();
  }, [loadTests]);

  useEffect(() => {
    if (adminTab === 'bank') loadBank();
  }, [adminTab, loadBank]);

  async function createTest(event) {
    event.preventDefault();
    try {
      await api.createTest(token, {
        title: newTest.title,
        tags: newTest.tags.split(',').map((t) => t.trim()).filter(Boolean),
        durationMinutes: Number(newTest.durationMinutes),
        totalMarks: Number(newTest.totalMarks),
        startTime: new Date(newTest.startTime).toISOString(),
        endTime: new Date(newTest.endTime).toISOString(),
        isApproved: Boolean(newTest.isApproved),
        questions: [],
      });
      setMessage('Test created.');
      loadTests();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function updateApproval(value) {
    if (!selectedTestId) return;
    try {
      await api.updateApproval(token, selectedTestId, value);
      setMessage(value ? 'Approved.' : 'Unapproved.');
      loadTests();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function addQuestion(event) {
    event.preventDefault();
    if (!selectedTestId) {
      setMessage('Select test first.');
      return;
    }
    try {
      await api.addQuestion(token, selectedTestId, questionDraft);
      setQuestionDraft(buildDefaultQuestion());
      setMessage('Question added.');
      loadTests();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function uploadImage(file, target, index = 0) {
    if (!file) return;
    try {
      const data = await api.uploadImage(token, file);
      setQuestionDraft((prev) => {
        if (target === 'question') return { ...prev, question: { ...prev.question, image: data.imageDataUrl } };
        if (target === 'solution') return { ...prev, solution: { ...prev.solution, image: data.imageDataUrl } };
        const options = [...prev.options];
        options[index] = { ...options[index], image: data.imageDataUrl };
        return { ...prev, options };
      });
      setMessage('Image uploaded.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  // ── Question Bank ─────────────────────────────────────────────────────────

  async function saveBankQuestion(event) {
    event.preventDefault();
    try {
      const payload = {
        question: bankDraft.question,
        options: bankDraft.options,
        type: bankDraft.type,
        numerical: {
          answer: bankDraft.numerical.answer !== '' ? Number(bankDraft.numerical.answer) : null,
          tolerance: Number(bankDraft.numerical.tolerance || 0),
          min: bankDraft.numerical.min !== '' ? Number(bankDraft.numerical.min) : null,
          max: bankDraft.numerical.max !== '' ? Number(bankDraft.numerical.max) : null,
        },
        marks: bankDraft.marks,
        solution: bankDraft.solution,
        subject: bankDraft.subject,
        topic: bankDraft.topic,
        difficulty: bankDraft.difficulty,
        section: bankDraft.section,
        tags: bankDraft.tags.split(',').map((t) => t.trim()).filter(Boolean),
      };

      if (editingBankId) {
        await api.updateBankQuestion(token, editingBankId, payload);
        setMessage('Question updated in bank.');
      } else {
        await api.createBankQuestion(token, payload);
        setMessage('Question added to bank.');
      }

      setBankDraft(DEFAULT_BANK_Q());
      setEditingBankId(null);
      setBankFormOpen(false);
      loadBank();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function deleteBankQuestion(id) {
    if (!window.confirm('Delete this question from bank?')) return;
    try {
      await api.deleteBankQuestion(token, id);
      setMessage('Question deleted.');
      loadBank();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function addSelectedToTest() {
    if (!addToTestId) { setMessage('Select a test first.'); return; }
    if (!selectedBankIds.length) { setMessage('Select at least one question.'); return; }
    try {
      const resp = await api.addBankQuestionsToTest(token, addToTestId, selectedBankIds);
      setMessage(`Added ${resp.addedCount} question(s) to test.`);
      setSelectedBankIds([]);
      loadTests();
    } catch (error) {
      setMessage(error.message);
    }
  }

  function startEditBank(q) {
    setBankDraft({
      question: { text: q.question.text, image: q.question.image || null },
      options: q.options.map((o) => ({ ...o })),
      type: q.type,
      numerical: {
        answer: q.numerical?.answer ?? '',
        tolerance: q.numerical?.tolerance ?? 0,
        min: q.numerical?.min ?? '',
        max: q.numerical?.max ?? '',
      },
      marks: { ...q.marks },
      solution: { text: q.solution?.text || '', image: q.solution?.image || null },
      subject: q.subject,
      topic: q.topic,
      difficulty: q.difficulty,
      section: q.section || 'Core',
      tags: (q.tags || []).join(', '),
    });
    setEditingBankId(q._id);
    setBankFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function toggleBankSelect(id) {
    setSelectedBankIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function uploadBankImage(file, target, index = 0) {
    if (!file) return;
    try {
      const data = await api.uploadImage(token, file);
      setBankDraft((prev) => {
        if (target === 'question') return { ...prev, question: { ...prev.question, image: data.imageDataUrl } };
        if (target === 'solution') return { ...prev, solution: { ...prev.solution, image: data.imageDataUrl } };
        const options = [...prev.options];
        options[index] = { ...options[index], image: data.imageDataUrl };
        return { ...prev, options };
      });
    } catch (error) {
      setMessage(error.message);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <section className="admin-shell">
      {/* Admin tab bar */}
      <div className="admin-tabs">
        <button
          type="button"
          className={`section-tab${adminTab === 'tests' ? ' active' : ''}`}
          onClick={() => setAdminTab('tests')}
        >
          🗂 Tests
        </button>
        <button
          type="button"
          className={`section-tab${adminTab === 'bank' ? ' active' : ''}`}
          onClick={() => setAdminTab('bank')}
        >
          📚 Question Bank
        </button>
      </div>

      {/* ── Tests Tab ────────────────────────────────────────────────────── */}
      {adminTab === 'tests' && (
        <section className="dashboard-layout">
          <article className="card panel-left">
            <h2>Create Test</h2>
            <form className="stack" onSubmit={createTest}>
              <label>
                Title
                <input
                  value={newTest.title}
                  onChange={(e) => setNewTest((p) => ({ ...p, title: e.target.value }))}
                  required
                />
              </label>
              <label>
                Tags (comma separated)
                <input
                  value={newTest.tags}
                  onChange={(e) => setNewTest((p) => ({ ...p, tags: e.target.value }))}
                />
              </label>
              <div className="double-grid">
                <label>
                  Duration (min)
                  <input
                    type="number"
                    value={newTest.durationMinutes}
                    onChange={(e) => setNewTest((p) => ({ ...p, durationMinutes: e.target.value }))}
                  />
                </label>
                <label>
                  Total Marks
                  <input
                    type="number"
                    value={newTest.totalMarks}
                    onChange={(e) => setNewTest((p) => ({ ...p, totalMarks: e.target.value }))}
                  />
                </label>
              </div>
              <div className="double-grid">
                <label>
                  Start Time
                  <input
                    type="datetime-local"
                    value={newTest.startTime}
                    onChange={(e) => setNewTest((p) => ({ ...p, startTime: e.target.value }))}
                  />
                </label>
                <label>
                  End Time
                  <input
                    type="datetime-local"
                    value={newTest.endTime}
                    onChange={(e) => setNewTest((p) => ({ ...p, endTime: e.target.value }))}
                  />
                </label>
              </div>
              <label className="inline-check" style={{ fontWeight: 400 }}>
                <input
                  type="checkbox"
                  checked={newTest.isApproved}
                  onChange={(e) => setNewTest((p) => ({ ...p, isApproved: e.target.checked }))}
                />
                Approve immediately
              </label>
              <button type="submit">Create Test</button>
            </form>
          </article>

          <article className="card panel-right">
            <h2>Manage Test</h2>
            <label>
              Select Test
              <select value={selectedTestId} onChange={(e) => setSelectedTestId(e.target.value)}>
                <option value="">-- Select --</option>
                {tests.map((test) => (
                  <option key={test._id} value={test._id}>
                    {test.title} ({test.questions?.length || 0} Q) {test.isApproved ? '✅' : '⏳'}
                  </option>
                ))}
              </select>
            </label>
            {selectedTest && (
              <div className="stack" style={{ marginTop: '0.7rem' }}>
                <div className="button-row">
                  <button type="button" onClick={() => updateApproval(true)}>✅ Approve</button>
                  <button type="button" className="secondary" onClick={() => updateApproval(false)}>Unapprove</button>
                </div>
                <div className="kv-list">
                  <div><span>Questions</span><strong>{selectedTest.questions?.length || 0}</strong></div>
                  <div><span>Duration</span><strong>{selectedTest.durationMinutes} min</strong></div>
                  <div><span>Total Marks</span><strong>{selectedTest.totalMarks}</strong></div>
                  <div><span>Status</span><strong>{selectedTest.isApproved ? '✅ Approved' : '⏳ Draft'}</strong></div>
                </div>
              </div>
            )}
          </article>

          <article className="card full-width">
            <h2>Add Question to Test</h2>
            <form className="stack" onSubmit={addQuestion}>
              <label>
                Question Text
                <textarea
                  value={questionDraft.question.text}
                  onChange={(e) =>
                    setQuestionDraft((p) => ({ ...p, question: { ...p.question, text: e.target.value } }))
                  }
                  required
                />
              </label>
              <label>
                Question Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => uploadImage(e.target.files?.[0], 'question')}
                />
              </label>
              <div className="option-grid">
                {questionDraft.options.map((opt, i) => (
                  <div className="option-card" key={opt.id}>
                    <label>
                      Option {opt.id}
                      <input
                        value={opt.text}
                        onChange={(e) => {
                          const options = [...questionDraft.options];
                          options[i] = { ...options[i], text: e.target.value };
                          setQuestionDraft((p) => ({ ...p, options }));
                        }}
                        required
                      />
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => uploadImage(e.target.files?.[0], 'option', i)}
                    />
                    <label className="inline-check">
                      <input
                        type="radio"
                        checked={opt.isCorrect}
                        onChange={() => {
                          const options = questionDraft.options.map((item, idx) => ({
                            ...item,
                            isCorrect: idx === i,
                          }));
                          setQuestionDraft((p) => ({ ...p, options }));
                        }}
                      />
                      Correct
                    </label>
                  </div>
                ))}
              </div>
              <button type="submit">Add Question to {selectedTest?.title || 'Selected Test'}</button>
            </form>
          </article>
        </section>
      )}

      {/* ── Question Bank Tab ─────────────────────────────────────────────── */}
      {adminTab === 'bank' && (
        <section className="bank-tab">
          {/* Bank form */}
          <div className="bank-form-toggle">
            <button
              type="button"
              onClick={() => {
                setBankFormOpen((v) => !v);
                if (editingBankId) { setEditingBankId(null); setBankDraft(DEFAULT_BANK_Q()); }
              }}
            >
              {bankFormOpen ? '✕ Close Form' : '＋ Add New Question'}
            </button>
          </div>

          {bankFormOpen && (
            <article className="card" style={{ marginBottom: '1rem' }}>
              <h3>{editingBankId ? 'Edit Question' : 'Add to Question Bank'}</h3>
              <form className="stack" onSubmit={saveBankQuestion}>
                <div className="double-grid">
                  <label>
                    Type
                    <select
                      value={bankDraft.type}
                      onChange={(e) => setBankDraft((p) => ({ ...p, type: e.target.value }))}
                    >
                      <option value="MCQ">MCQ</option>
                      <option value="MSQ">MSQ</option>
                      <option value="NAT">NAT</option>
                    </select>
                  </label>
                  <label>
                    Difficulty
                    <select
                      value={bankDraft.difficulty}
                      onChange={(e) => setBankDraft((p) => ({ ...p, difficulty: e.target.value }))}
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </label>
                </div>
                <div className="double-grid">
                  <label>
                    Subject
                    <input
                      value={bankDraft.subject}
                      onChange={(e) => setBankDraft((p) => ({ ...p, subject: e.target.value }))}
                    />
                  </label>
                  <label>
                    Topic
                    <input
                      value={bankDraft.topic}
                      onChange={(e) => setBankDraft((p) => ({ ...p, topic: e.target.value }))}
                    />
                  </label>
                </div>
                <label>
                  Question Text
                  <textarea
                    value={bankDraft.question.text}
                    onChange={(e) =>
                      setBankDraft((p) => ({ ...p, question: { ...p.question, text: e.target.value } }))
                    }
                    required
                  />
                </label>
                <label>
                  Question Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => uploadBankImage(e.target.files?.[0], 'question')}
                  />
                </label>

                {(bankDraft.type === 'MCQ' || bankDraft.type === 'MSQ') && (
                  <div className="option-grid">
                    {bankDraft.options.map((opt, i) => (
                      <div className="option-card" key={opt.id}>
                        <label>
                          Option {opt.id}
                          <input
                            value={opt.text}
                            onChange={(e) => {
                              const options = [...bankDraft.options];
                              options[i] = { ...options[i], text: e.target.value };
                              setBankDraft((p) => ({ ...p, options }));
                            }}
                          />
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => uploadBankImage(e.target.files?.[0], 'option', i)}
                        />
                        <label className="inline-check">
                          <input
                            type={bankDraft.type === 'MSQ' ? 'checkbox' : 'radio'}
                            checked={opt.isCorrect}
                            onChange={() => {
                              const options = bankDraft.options.map((item, idx) => ({
                                ...item,
                                isCorrect:
                                  bankDraft.type === 'MSQ'
                                    ? idx === i ? !item.isCorrect : item.isCorrect
                                    : idx === i,
                              }));
                              setBankDraft((p) => ({ ...p, options }));
                            }}
                          />
                          Correct
                        </label>
                      </div>
                    ))}
                  </div>
                )}

                {bankDraft.type === 'NAT' && (
                  <div className="double-grid">
                    <label>
                      Correct Answer
                      <input
                        type="number"
                        value={bankDraft.numerical.answer}
                        onChange={(e) =>
                          setBankDraft((p) => ({
                            ...p,
                            numerical: { ...p.numerical, answer: e.target.value },
                          }))
                        }
                      />
                    </label>
                    <label>
                      Tolerance
                      <input
                        type="number"
                        value={bankDraft.numerical.tolerance}
                        onChange={(e) =>
                          setBankDraft((p) => ({
                            ...p,
                            numerical: { ...p.numerical, tolerance: e.target.value },
                          }))
                        }
                      />
                    </label>
                  </div>
                )}

                <div className="double-grid">
                  <label>
                    Marks (+)
                    <input
                      type="number"
                      value={bankDraft.marks.total}
                      onChange={(e) =>
                        setBankDraft((p) => ({ ...p, marks: { ...p.marks, total: Number(e.target.value) } }))
                      }
                    />
                  </label>
                  <label>
                    Negative Marks
                    <input
                      type="number"
                      value={bankDraft.marks.negative}
                      onChange={(e) =>
                        setBankDraft((p) => ({
                          ...p,
                          marks: { ...p.marks, negative: Number(e.target.value) },
                        }))
                      }
                    />
                  </label>
                </div>

                <label>
                  Solution / Explanation
                  <textarea
                    value={bankDraft.solution.text}
                    onChange={(e) =>
                      setBankDraft((p) => ({ ...p, solution: { ...p.solution, text: e.target.value } }))
                    }
                  />
                </label>

                <label>
                  Tags (comma separated)
                  <input
                    value={bankDraft.tags}
                    onChange={(e) => setBankDraft((p) => ({ ...p, tags: e.target.value }))}
                  />
                </label>

                <div className="button-row">
                  <button type="submit">{editingBankId ? 'Update Question' : 'Save to Bank'}</button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      setBankDraft(DEFAULT_BANK_Q());
                      setEditingBankId(null);
                      setBankFormOpen(false);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </article>
          )}

          {/* Add selected to test bar */}
          {selectedBankIds.length > 0 && (
            <div className="bank-action-bar card">
              <span>{selectedBankIds.length} question(s) selected</span>
              <label>
                Add to test:
                <select value={addToTestId} onChange={(e) => setAddToTestId(e.target.value)}>
                  <option value="">-- Select Test --</option>
                  {tests.map((t) => (
                    <option key={t._id} value={t._id}>{t.title}</option>
                  ))}
                </select>
              </label>
              <button type="button" onClick={addSelectedToTest}>Add to Test</button>
              <button type="button" className="secondary" onClick={() => setSelectedBankIds([])}>Clear</button>
            </div>
          )}

          {/* Bank filters */}
          <div className="bank-filters card">
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <label style={{ flex: 1, minWidth: 150 }}>
                Search
                <input
                  value={bankFilter.search}
                  onChange={(e) => setBankFilter((p) => ({ ...p, search: e.target.value }))}
                  placeholder="Search question text..."
                />
              </label>
              <label>
                Subject
                <input
                  value={bankFilter.subject}
                  onChange={(e) => setBankFilter((p) => ({ ...p, subject: e.target.value }))}
                  placeholder="e.g. OS"
                />
              </label>
              <label>
                Type
                <select
                  value={bankFilter.type}
                  onChange={(e) => setBankFilter((p) => ({ ...p, type: e.target.value }))}
                >
                  <option value="">All Types</option>
                  <option value="MCQ">MCQ</option>
                  <option value="MSQ">MSQ</option>
                  <option value="NAT">NAT</option>
                </select>
              </label>
              <button type="button" onClick={() => { setBankPage(1); loadBank(); }}>
                🔍 Search
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setBankFilter({ subject: '', type: '', search: '' });
                  setBankPage(1);
                }}
              >
                Reset
              </button>
            </div>
            <p className="muted small" style={{ marginTop: '0.5rem' }}>
              {bankTotal} question(s) in bank
            </p>
          </div>

          {/* Bank question list */}
          <div className="stack">
            {bankQuestions.length === 0 && (
              <p className="muted">No questions in bank. Add some above.</p>
            )}
            {bankQuestions.map((q) => (
              <div
                key={q._id}
                className={`bank-q-item card${selectedBankIds.includes(q._id) ? ' bank-q-selected' : ''}`}
              >
                <div className="bank-q-meta">
                  <label className="inline-check" style={{ fontWeight: 400 }}>
                    <input
                      type="checkbox"
                      checked={selectedBankIds.includes(q._id)}
                      onChange={() => toggleBankSelect(q._id)}
                    />
                    &nbsp;
                  </label>
                  <span className="tag-pill type-pill">{q.type}</span>
                  <span className="tag-pill">{q.subject}</span>
                  <span className="tag-pill">{q.topic}</span>
                  <span className="tag-pill">{q.difficulty}</span>
                  <span className="pill">+{q.marks?.total}</span>
                  {q.marks?.negative > 0 && <span className="pill danger">−{q.marks.negative}</span>}
                </div>
                <p className="bank-q-text">{q.question?.text}</p>
                <div className="button-row" style={{ marginTop: '0.4rem' }}>
                  <button type="button" className="secondary" onClick={() => startEditBank(q)}>
                    ✏️ Edit
                  </button>
                  <button type="button" className="secondary" style={{ color: '#dc2626' }} onClick={() => deleteBankQuestion(q._id)}>
                    🗑 Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {bankTotal > 30 && (
            <div className="button-row" style={{ marginTop: '0.8rem' }}>
              <button
                type="button"
                className="secondary"
                disabled={bankPage <= 1}
                onClick={() => setBankPage((p) => p - 1)}
              >
                ← Prev
              </button>
              <span className="muted">Page {bankPage} / {Math.ceil(bankTotal / 30)}</span>
              <button
                type="button"
                className="secondary"
                disabled={bankPage >= Math.ceil(bankTotal / 30)}
                onClick={() => setBankPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </section>
      )}
    </section>
  );
}
