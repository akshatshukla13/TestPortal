import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import { buildDefaultQuestion } from '../../utils/format';

export default function AdminPage({ token, setMessage }) {
  const [tests, setTests] = useState([]);
  const [selectedTestId, setSelectedTestId] = useState('');
  const [newTest, setNewTest] = useState({
    title: '',
    tags: 'gate, cs, mock',
    durationMinutes: 180,
    totalMarks: 100,
    startTime: new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 16),
    endTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString().slice(0, 16),
    isApproved: false,
  });
  const [questionDraft, setQuestionDraft] = useState(buildDefaultQuestion());

  const selectedTest = useMemo(
    () => tests.find((test) => test._id === selectedTestId),
    [tests, selectedTestId]
  );

  useEffect(() => {
    loadTests();
  }, [token]);

  async function loadTests() {
    try {
      const data = await api.getAllTests(token);
      setTests(data.tests || []);
      if (!selectedTestId && data.tests?.length) {
        setSelectedTestId(data.tests[0]._id);
      }
    } catch (error) {
      setMessage(error.message);
    }
  }

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
        if (target === 'question') {
          return { ...prev, question: { ...prev.question, image: data.imageDataUrl } };
        }
        if (target === 'solution') {
          return { ...prev, solution: { ...prev.solution, image: data.imageDataUrl } };
        }
        const options = [...prev.options];
        options[index] = { ...options[index], image: data.imageDataUrl };
        return { ...prev, options };
      });
      setMessage('Image uploaded.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <section className="dashboard-layout">
      <article className="card panel-left">
        <h2>Create Test</h2>
        <form className="stack" onSubmit={createTest}>
          <label>
            Title
            <input value={newTest.title} onChange={(e) => setNewTest((p) => ({ ...p, title: e.target.value }))} required />
          </label>
          <label>
            Tags
            <input value={newTest.tags} onChange={(e) => setNewTest((p) => ({ ...p, tags: e.target.value }))} />
          </label>
          <button type="submit">Create</button>
        </form>
      </article>

      <article className="card panel-right">
        <h2>Manage Test</h2>
        <label>
          Select Test
          <select value={selectedTestId} onChange={(e) => setSelectedTestId(e.target.value)}>
            <option value="">-- Select --</option>
            {tests.map((test) => (
              <option key={test._id} value={test._id}>{test.title}</option>
            ))}
          </select>
        </label>
        {selectedTest && (
          <div className="button-row">
            <button type="button" onClick={() => updateApproval(true)}>Approve</button>
            <button type="button" className="secondary" onClick={() => updateApproval(false)}>Unapprove</button>
          </div>
        )}
      </article>

      <article className="card full-width">
        <h2>Add Question</h2>
        <form className="stack" onSubmit={addQuestion}>
          <label>
            Question
            <textarea
              value={questionDraft.question.text}
              onChange={(e) => setQuestionDraft((p) => ({ ...p, question: { ...p.question, text: e.target.value } }))}
              required
            />
          </label>
          <label>
            Question Image
            <input type="file" accept="image/*" onChange={(e) => uploadImage(e.target.files?.[0], 'question')} />
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
                <input type="file" accept="image/*" onChange={(e) => uploadImage(e.target.files?.[0], 'option', i)} />
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
          <button type="submit">Add Question</button>
        </form>
      </article>
    </section>
  );
}
