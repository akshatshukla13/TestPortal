import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import { formatDateTime } from '../../utils/format';
import { goTo, openInNewTab } from '../../router';

const CATEGORY_LABEL = {
  'full-mock': 'Full Mock',
  'subject-wise': 'Subject',
  'topic-wise': 'Topic',
  pyq: 'PYQ',
};

const CATEGORY_COLOR = {
  'full-mock': 'cat-pill-full',
  'subject-wise': 'cat-pill-subject',
  'topic-wise': 'cat-pill-topic',
  pyq: 'cat-pill-pyq',
};

export default function DashboardPage({ token, setMessage }) {
  const [tests, setTests] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [selectedAttemptId, setSelectedAttemptId] = useState('');

  const selectedAttempt = useMemo(
    () => attempts.find((a) => String(a._id) === String(selectedAttemptId)) || attempts[0],
    [attempts, selectedAttemptId],
  );

  useEffect(() => {
    loadData();
  }, [token]);

  async function loadData() {
    try {
      const [testsData, attemptsData, summaryData, recoData] = await Promise.all([
        api.getAvailableTests(token),
        api.getMyAttempts(token),
        api.getMySummary(token).catch(() => null),
        api.getRecommendations(token).catch(() => null),
      ]);
      setTests(testsData.tests || []);
      setAttempts(attemptsData.attempts || []);
      if (attemptsData.attempts?.length) {
        setSelectedAttemptId(String(attemptsData.attempts[0]._id));
      }
      if (summaryData) setSummary(summaryData.summary || null);
      if (recoData) setRecommendations(recoData.tests || []);
    } catch (error) {
      setMessage(error.message);
    }
  }

  function openTest(testId) {
    openInNewTab(`/test/${testId}`);
    setMessage('Test opened in a new secure browser tab.');
  }

  function openReport(tab, mode = 'current') {
    if (!selectedAttempt?.test?._id) {
      setMessage('Attempt at least one test to open report tabs.');
      return;
    }
    const path = `/report/${tab}/${selectedAttempt.test._id}`;
    if (mode === 'new') {
      openInNewTab(path);
    } else {
      goTo(path);
    }
  }

  return (
    <section className="grid gap-4">
      {/* Performance snapshot */}
      {summary && (
        <article className="bg-white border border-[var(--line)] rounded-2xl p-4 shadow-[0_16px_40px_rgba(21,29,43,0.08)]">
          <h3>📊 Performance Snapshot</h3>
          <div className="grid grid-cols-4 gap-2.5">
            <div className="border border-[var(--line)] rounded-xl p-2.5 bg-white">
              <p className="m-0 text-[var(--muted)] text-[0.82rem]">Tests Taken</p>
              <h4 className="text-[1.12rem] mt-1 mb-0">{summary.totalAttempts ?? 0}</h4>
            </div>
            <div className="border border-[var(--line)] rounded-xl p-2.5 bg-white">
              <p className="m-0 text-[var(--muted)] text-[0.82rem]">Avg Score</p>
              <h4 className="text-[1.12rem] mt-1 mb-0">{summary.averageScore ?? 0}</h4>
            </div>
            <div className="border border-[var(--line)] rounded-xl p-2.5 bg-white">
              <p className="m-0 text-[var(--muted)] text-[0.82rem]">Accuracy</p>
              <h4 className="text-[1.12rem] mt-1 mb-0">{summary.accuracy ?? 0}%</h4>
            </div>
            <div className="border border-[var(--line)] rounded-xl p-2.5 bg-white">
              <p className="m-0 text-[var(--muted)] text-[0.82rem]">Best Score</p>
              <h4 className="text-[1.12rem] mt-1 mb-0">{summary.bestScore ?? 0}</h4>
            </div>
          </div>
          {(summary.strongSubjects?.length > 0 || summary.weakSubjects?.length > 0) && (
            <div className="flex gap-3 flex-wrap mt-3">
              {summary.strongSubjects?.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap text-sm font-semibold text-[#14833b]">
                  <span>💪 Strong: </span>
                  {summary.strongSubjects.map((s) => (
                    <span key={s} className="inline-flex items-center rounded-full border border-[var(--line)] px-1.5 py-0.5 text-xs bg-[var(--card-soft)] mr-1">{s}</span>
                  ))}
                </div>
              )}
              {summary.weakSubjects?.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap text-sm font-semibold text-[#bf3131]">
                  <span>📉 Weak: </span>
                  {summary.weakSubjects.map((s) => (
                    <span key={s} className="inline-flex items-center rounded-full border border-[var(--line)] px-1.5 py-0.5 text-xs bg-[var(--card-soft)] mr-1">{s}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </article>
      )}

      <section className="grid grid-cols-[420px_1fr] gap-4">
        {/* Available tests */}
        <article className="bg-white border border-[var(--line)] rounded-2xl p-4 shadow-[0_16px_40px_rgba(21,29,43,0.08)] min-h-[70vh]">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h2>📋 Available Tests</h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--card-soft)] text-[var(--muted)] border border-[var(--line)]">{tests.length} test{tests.length !== 1 ? 's' : ''}</span>
          </div>
          <p className="text-[var(--muted)] m-0">Start active tests in dedicated exam tabs.</p>
          <div className="grid gap-3">
            {tests.length === 0 && (
              <div className="border border-dashed border-[var(--line)] rounded-xl p-6 text-center">
                <p className="text-[var(--muted)] m-0">No currently active approved tests.</p>
              </div>
            )}
            {tests.map((test) => (
              <div className="border border-[var(--line)] rounded-xl p-2.5 flex items-start justify-between gap-3" key={test._id}>
                <div style={{ flex: 1 }}>
                  <strong>{test.title}</strong>
                  <div className="flex gap-1.5 flex-wrap mt-1">
                    {test.category && (
                      <span className={`border border-[var(--line)] rounded-full px-1.5 py-0.5 text-xs bg-[var(--card-soft)] ${CATEGORY_COLOR[test.category] || ''}`}>
                        {CATEGORY_LABEL[test.category] || test.category}
                      </span>
                    )}
                    {test.difficultyLevel && <span>{test.difficultyLevel}</span>}
                  </div>
                  <p className="mt-1 text-[var(--muted)] text-sm">
                    ⏱ {test.durationMinutes} min &middot; {test.totalMarks} marks &middot;{' '}
                    {test.questions?.length || 0} questions
                  </p>
                  {test.attemptStatus && (
                    <span className={`attempt-status-badge ${test.attemptStatus}`}>
                      {test.attemptStatus === 'submitted' ? '✅ Completed' : '▶ In Progress'}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className={test.attemptStatus === 'submitted' ? 'secondary' : ''}
                  disabled={test.attemptStatus === 'submitted'}
                  onClick={() => openTest(test._id)}
                >
                  {test.attemptStatus === 'submitted'
                    ? 'Done'
                    : test.attemptStatus === 'in_progress'
                      ? '▶ Resume'
                      : '▶ Start'}
                </button>
              </div>
            ))}
          </div>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div style={{ marginTop: '1.4rem' }}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <h3>🎯 Recommended Practice</h3>
              </div>
              <p className="text-[var(--muted)] m-0 mt-1 text-sm">Based on your weak areas</p>
              <div className="grid gap-3">
                {recommendations.map((test) => (
                  <div className="border border-[var(--line)] rounded-xl p-2.5 flex items-start justify-between gap-3" key={test._id}>
                    <div style={{ flex: 1 }}>
                      <strong>{test.title}</strong>
                      <p className="mt-1 text-[var(--muted)] text-sm">⏱ {test.durationMinutes} min · {test.totalMarks} marks</p>
                    </div>
                    <button type="button" onClick={() => openTest(test._id)}>▶ Start</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </article>

        {/* Report navigation */}
        <article className="bg-white border border-[var(--line)] rounded-2xl p-4 shadow-[0_16px_40px_rgba(21,29,43,0.08)] min-h-[70vh]">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h2>📈 Reports & Analysis</h2>
          </div>
          <p className="text-[var(--muted)] m-0">Open every analysis section in separate browser tabs.</p>

          <label>
            Select Attempt For Reports
            <select
              value={selectedAttempt?._id || ''}
              onChange={(e) => setSelectedAttemptId(e.target.value)}
            >
              <option value="">-- Select --</option>
              {attempts.map((attempt) => (
                <option key={attempt._id} value={attempt._id}>
                  {attempt.test?.title} | Score {attempt.score} |{' '}
                  {formatDateTime(attempt.submittedAt)}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-2.5">
            <button type="button" className="report-nav-btn bg-[var(--card-soft)] text-[var(--ink)] border-[var(--line)] text-left font-semibold" onClick={() => openReport('score', 'current')}>
              📊 Score Card
            </button>
            <button type="button" className="report-nav-btn bg-[var(--card-soft)] text-[var(--ink)] border-[var(--line)] text-left font-semibold" onClick={() => openReport('subject', 'new')}>
              📚 Subject Report
            </button>
            <button type="button" className="report-nav-btn bg-[var(--card-soft)] text-[var(--ink)] border-[var(--line)] text-left font-semibold" onClick={() => openReport('solution', 'new')}>
              ✅ Solutions
            </button>
            <button type="button" className="report-nav-btn bg-[var(--card-soft)] text-[var(--ink)] border-[var(--line)] text-left font-semibold" onClick={() => openReport('question', 'new')}>
              🔍 Question Analysis
            </button>
            <button type="button" className="report-nav-btn bg-[var(--card-soft)] text-[var(--ink)] border-[var(--line)] text-left font-semibold" onClick={() => openReport('compare', 'new')}>
              📈 Compare Yourself
            </button>
          </div>

          {selectedAttempt && (
            <div className="mt-3 border border-[var(--line)] rounded-xl p-2.5 grid grid-cols-3 gap-2.5">
              <div>
                <small className="block text-[var(--muted)]">Score</small>
                <strong>{selectedAttempt.score}</strong>
              </div>
              <div>
                <small className="block text-[var(--muted)]">Total Marks</small>
                <strong>{selectedAttempt.test?.totalMarks || '-'}</strong>
              </div>
              <div>
                <small className="block text-[var(--muted)]">Submitted</small>
                <strong>{formatDateTime(selectedAttempt.submittedAt)}</strong>
              </div>
            </div>
          )}

          {/* Attempt history */}
          {attempts.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <h3>🕒 Attempt History</h3>
              <div className="grid gap-3">
                {attempts.map((attempt) => (
                  <div className="border border-[var(--line)] rounded-xl px-3 py-2.5 flex items-center justify-between gap-3" key={attempt._id}>
                    <div>
                      <strong>{attempt.test?.title}</strong>
                      <p className="mt-1 text-[var(--muted)] text-sm">{formatDateTime(attempt.submittedAt)}</p>
                    </div>
                    <div className="font-bold text-[0.9rem] text-[var(--accent)]">
                      {attempt.score} / {attempt.test?.totalMarks || '?'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </article>
      </section>
    </section>
  );
}
