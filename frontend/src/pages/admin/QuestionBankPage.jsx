import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api';

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

export default function QuestionBankPage({ token, notifySuccess, notifyError, tests = [], testsLoading = false }) {
  const [bankQuestions, setBankQuestions] = useState([]);
  const [bankTotal, setBankTotal] = useState(0);
  const [bankLoading, setBankLoading] = useState(true);
  const [bankPage, setBankPage] = useState(1);
  const [bankFilter, setBankFilter] = useState({ subject: '', type: '', search: '', difficulty: '', tag: '' });
  const [bankDraft, setBankDraft] = useState(DEFAULT_BANK_Q);
  const [editingBankId, setEditingBankId] = useState(null);
  const [bankFormOpen, setBankFormOpen] = useState(false);
  const [selectedBankIds, setSelectedBankIds] = useState([]);
  const [addToTestId, setAddToTestId] = useState('');
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [deletingQuestionId, setDeletingQuestionId] = useState(null);
  const [addingToTest, setAddingToTest] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const loadBank = useCallback(async () => {
    setBankLoading(true);
    try {
      const params = { page: bankPage, limit: 30 };
      if (bankFilter.subject) params.subject = bankFilter.subject;
      if (bankFilter.type) params.type = bankFilter.type;
      if (bankFilter.search) params.search = bankFilter.search;
      if (bankFilter.difficulty) params.difficulty = bankFilter.difficulty;
      if (bankFilter.tag) params.tag = bankFilter.tag;
      const data = await api.listQuestionBank(token, params);
      setBankQuestions(data.questions || []);
      setBankTotal(data.total || 0);
    } catch (err) {
      notifyError(err?.message || 'Failed to load question bank.');
    } finally {
      setBankLoading(false);
    }
  }, [token, bankPage, bankFilter, notifyError]);

  useEffect(() => { loadBank(); }, [loadBank]);

  async function saveBankQuestion(e) {
    e.preventDefault();
    setSavingQuestion(true);
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
        notifySuccess('Question updated in question bank.');
      } else {
        await api.createBankQuestion(token, payload);
        notifySuccess('Question added to question bank.');
      }
      setBankDraft(DEFAULT_BANK_Q());
      setEditingBankId(null);
      setBankFormOpen(false);
      await loadBank();
    } catch (err) {
      notifyError(err?.message || 'Failed to save question.');
    } finally {
      setSavingQuestion(false);
    }
  }

  async function deleteBankQuestion(id) {
    if (!window.confirm('Delete this question from bank?')) return;
    setDeletingQuestionId(id);
    try {
      await api.deleteBankQuestion(token, id);
      notifySuccess('Question deleted from bank.');
      await loadBank();
    } catch (err) {
      notifyError(err?.message || 'Failed to delete question.');
    } finally {
      setDeletingQuestionId(null);
    }
  }

  async function addSelectedToTest() {
    if (!addToTestId) { notifyError('Select a test first.'); return; }
    if (!selectedBankIds.length) { notifyError('Select at least one question.'); return; }
    setAddingToTest(true);
    try {
      const resp = await api.addBankQuestionsToTest(token, addToTestId, selectedBankIds);
      notifySuccess(`Added ${resp.addedCount} question(s) to test.`);
      setSelectedBankIds([]);
    } catch (err) {
      notifyError(err?.message || 'Failed to add selected questions to test.');
    } finally {
      setAddingToTest(false);
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
    setUploadingImage(true);
    try {
      const data = await api.uploadImage(token, file);
      setBankDraft((prev) => {
        if (target === 'question') return { ...prev, question: { ...prev.question, image: data.imageDataUrl } };
        if (target === 'solution') return { ...prev, solution: { ...prev.solution, image: data.imageDataUrl } };
        const options = [...prev.options];
        options[index] = { ...options[index], image: data.imageDataUrl };
        return { ...prev, options };
      });
      notifySuccess('Image uploaded successfully.');
    } catch (err) {
      notifyError(err?.message || 'Image upload failed.');
    } finally {
      setUploadingImage(false);
    }
  }

  return (
    <div className="grid gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="m-0">Question Bank</h2>
          <p className="text-[var(--muted)] text-sm m-0">{bankTotal} question(s) total</p>
        </div>
        <button
          type="button"
          disabled={savingQuestion || addingToTest || uploadingImage}
          onClick={() => {
            setBankFormOpen((v) => !v);
            if (editingBankId) { setEditingBankId(null); setBankDraft(DEFAULT_BANK_Q()); }
          }}
        >
          {bankFormOpen ? '✕ Close Form' : '＋ Add Question'}
        </button>
      </div>

      {/* Form */}
      {bankFormOpen && (
        <article className="bg-white border border-[var(--line)] rounded-2xl p-4 shadow-[0_16px_40px_rgba(21,29,43,0.08)]">
          <h3 className="m-0 mb-3">{editingBankId ? 'Edit Question' : 'Add to Question Bank'}</h3>
          <form className="grid gap-3" onSubmit={saveBankQuestion}>
            <div className="grid grid-cols-2 gap-2">
              <label>
                Type
                <select value={bankDraft.type} onChange={(e) => setBankDraft((p) => ({ ...p, type: e.target.value }))}>
                  <option value="MCQ">MCQ</option>
                  <option value="MSQ">MSQ</option>
                  <option value="NAT">NAT</option>
                </select>
              </label>
              <label>
                Difficulty
                <select value={bankDraft.difficulty} onChange={(e) => setBankDraft((p) => ({ ...p, difficulty: e.target.value }))}>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label>
                Subject
                <input value={bankDraft.subject} onChange={(e) => setBankDraft((p) => ({ ...p, subject: e.target.value }))} />
              </label>
              <label>
                Topic
                <input value={bankDraft.topic} onChange={(e) => setBankDraft((p) => ({ ...p, topic: e.target.value }))} />
              </label>
            </div>
            <label>
              Question Text
              <textarea
                value={bankDraft.question.text}
                onChange={(e) => setBankDraft((p) => ({ ...p, question: { ...p.question, text: e.target.value } }))}
                required
              />
            </label>
            <label>
              Question Image
              <input
                type="file"
                accept="image/*"
                disabled={savingQuestion || uploadingImage}
                onChange={(e) => uploadBankImage(e.target.files?.[0], 'question')}
              />
            </label>

            {(bankDraft.type === 'MCQ' || bankDraft.type === 'MSQ') && (
              <div className="grid grid-cols-2 gap-2.5">
                {bankDraft.options.map((opt, i) => (
                  <div className="border border-[var(--line)] rounded-xl p-2.5 bg-white" key={opt.id}>
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
                    <input type="file" accept="image/*" disabled={savingQuestion || uploadingImage} onChange={(e) => uploadBankImage(e.target.files?.[0], 'option', i)} />
                    <label className="flex items-center gap-2 font-semibold" style={{ fontWeight: 400 }}>
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
              <div className="grid grid-cols-2 gap-2">
                <label>
                  Correct Answer
                  <input
                    type="number"
                    value={bankDraft.numerical.answer}
                    onChange={(e) => setBankDraft((p) => ({ ...p, numerical: { ...p.numerical, answer: e.target.value } }))}
                  />
                </label>
                <label>
                  Tolerance
                  <input
                    type="number"
                    value={bankDraft.numerical.tolerance}
                    onChange={(e) => setBankDraft((p) => ({ ...p, numerical: { ...p.numerical, tolerance: e.target.value } }))}
                  />
                </label>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <label>
                Marks (+)
                <input
                  type="number"
                  value={bankDraft.marks.total}
                  onChange={(e) => setBankDraft((p) => ({ ...p, marks: { ...p.marks, total: Number(e.target.value) } }))}
                />
              </label>
              <label>
                Negative Marks
                <input
                  type="number"
                  value={bankDraft.marks.negative}
                  onChange={(e) => setBankDraft((p) => ({ ...p, marks: { ...p.marks, negative: Number(e.target.value) } }))}
                />
              </label>
            </div>

            <label>
              Solution / Explanation
              <textarea
                value={bankDraft.solution.text}
                onChange={(e) => setBankDraft((p) => ({ ...p, solution: { ...p.solution, text: e.target.value } }))}
              />
            </label>
            <label>
              Tags (comma separated)
              <input value={bankDraft.tags} onChange={(e) => setBankDraft((p) => ({ ...p, tags: e.target.value }))} />
            </label>

            <div className="flex gap-2">
              <button type="submit" disabled={savingQuestion || uploadingImage}>
                {savingQuestion ? 'Saving…' : editingBankId ? 'Update Question' : 'Save to Bank'}
              </button>
              <button
                type="button"
                className="secondary"
                disabled={savingQuestion}
                onClick={() => { setBankDraft(DEFAULT_BANK_Q()); setEditingBankId(null); setBankFormOpen(false); }}
              >
                Cancel
              </button>
            </div>
          </form>
        </article>
      )}

      {/* Add selected to test bar */}
      {selectedBankIds.length > 0 && (
        <div className="bg-white border border-[var(--line)] rounded-2xl p-4 shadow-[0_16px_40px_rgba(21,29,43,0.08)] flex items-center gap-3 flex-wrap" style={{ background: '#eff6ff', borderColor: '#93c5fd' }}>
          <span>{selectedBankIds.length} question(s) selected</span>
          <label>
            Add to test:
            <select value={addToTestId} onChange={(e) => setAddToTestId(e.target.value)}>
              <option value="">{testsLoading ? 'Loading tests...' : '-- Select Test --'}</option>
              {tests.map((t) => (
                <option key={t._id} value={t._id}>{t.title}</option>
              ))}
            </select>
          </label>
          <button type="button" onClick={addSelectedToTest} disabled={testsLoading || addingToTest}>
            {addingToTest ? 'Adding…' : 'Add to Test'}
          </button>
          <button type="button" className="secondary" disabled={addingToTest} onClick={() => setSelectedBankIds([])}>Clear</button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-[var(--line)] rounded-2xl p-4 shadow-[0_16px_40px_rgba(21,29,43,0.08)]">
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={{ flex: 1, minWidth: 150 }}>
            Search
            <input
              value={bankFilter.search}
              onChange={(e) => setBankFilter((p) => ({ ...p, search: e.target.value }))}
              placeholder="Search question text…"
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
            <select value={bankFilter.type} onChange={(e) => setBankFilter((p) => ({ ...p, type: e.target.value }))}>
              <option value="">All Types</option>
              <option value="MCQ">MCQ</option>
              <option value="MSQ">MSQ</option>
              <option value="NAT">NAT</option>
            </select>
          </label>
          <label>
            Difficulty
            <select value={bankFilter.difficulty} onChange={(e) => setBankFilter((p) => ({ ...p, difficulty: e.target.value }))}>
              <option value="">All</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </label>
          <label>
            Tag
            <input
              value={bankFilter.tag}
              onChange={(e) => setBankFilter((p) => ({ ...p, tag: e.target.value }))}
              placeholder="e.g. aptitude"
            />
          </label>
          <button type="button" disabled={bankLoading} onClick={() => { setBankPage(1); loadBank(); }}>🔍 Search</button>
          <button type="button" className="secondary" disabled={bankLoading} onClick={() => { setBankFilter({ subject: '', type: '', search: '', difficulty: '', tag: '' }); setBankPage(1); }}>Reset</button>
        </div>
      </div>

      {/* Question list */}
      <div className="grid gap-3">
        {bankLoading && (
          <p className="text-[var(--muted)] m-0">Loading question bank...</p>
        )}
        {!bankLoading && bankQuestions.length === 0 && (
          <p className="text-[var(--muted)] m-0">No questions found. Add some above.</p>
        )}
        {!bankLoading && bankQuestions.map((q) => (
          <div
            key={q._id}
            className={`bg-white border border-[var(--line)] rounded-2xl shadow-[0_16px_40px_rgba(21,29,43,0.08)] px-3.5 py-2.5${selectedBankIds.includes(q._id) ? ' bank-q-selected' : ''}`}
          >
            <div className="flex flex-wrap gap-1.5 items-center mb-1.5">
              <label className="flex items-center gap-2" style={{ fontWeight: 400 }}>
                <input type="checkbox" checked={selectedBankIds.includes(q._id)} onChange={() => toggleBankSelect(q._id)} />
              </label>
              <span className="inline-flex items-center rounded-full border border-[var(--line)] px-1.5 py-0.5 text-xs bg-[var(--card-soft)]">{q.type}</span>
              <span className="inline-flex items-center rounded-full border border-[var(--line)] px-1.5 py-0.5 text-xs bg-[var(--card-soft)]">{q.subject}</span>
              <span className="inline-flex items-center rounded-full border border-[var(--line)] px-1.5 py-0.5 text-xs bg-[var(--card-soft)]">{q.topic}</span>
              <span className="inline-flex items-center rounded-full border border-[var(--line)] px-1.5 py-0.5 text-xs bg-[var(--card-soft)]">{q.difficulty}</span>
              <span className="inline-flex items-center rounded-full border border-[var(--line)] px-1.5 py-0.5 text-xs bg-[var(--card-soft)]">+{q.marks?.total}</span>
              {q.marks?.negative > 0 && (
                <span className="inline-flex items-center rounded-full border border-[var(--line)] px-1.5 py-0.5 text-xs" style={{ background: '#fee2e2', color: '#dc2626' }}>
                  −{q.marks.negative}
                </span>
              )}
            </div>
            <p className="m-0 text-sm text-[var(--ink)] line-clamp-2">{q.question?.text}</p>
            <div className="flex gap-2 mt-2">
              <button type="button" className="secondary" disabled={savingQuestion || deletingQuestionId === q._id} onClick={() => startEditBank(q)}>✏️ Edit</button>
              <button
                type="button"
                className="secondary"
                style={{ color: '#dc2626' }}
                disabled={savingQuestion || deletingQuestionId === q._id}
                onClick={() => deleteBankQuestion(q._id)}
              >
                {deletingQuestionId === q._id ? 'Deleting…' : '🗑 Delete'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {bankTotal > 30 && (
        <div className="flex gap-2 items-center">
          <button type="button" className="secondary" disabled={bankPage <= 1} onClick={() => setBankPage((p) => p - 1)}>← Prev</button>
          <span className="text-[var(--muted)] text-sm">Page {bankPage} / {Math.ceil(bankTotal / 30)}</span>
          <button type="button" className="secondary" disabled={bankPage >= Math.ceil(bankTotal / 30)} onClick={() => setBankPage((p) => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}
