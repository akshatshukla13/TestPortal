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
    <section className="dashboard-outer">
      {/* Performance snapshot */}
      {summary && (
        <article className="card dashboard-snapshot">
          <h3>📊 Performance Snapshot</h3>
          <div className="stats-grid">
            <div className="stat-card compact">
              <p>Tests Taken</p>
              <h4>{summary.totalAttempts ?? 0}</h4>
            </div>
            <div className="stat-card compact">
              <p>Avg Score</p>
              <h4>{summary.averageScore ?? 0}</h4>
            </div>
            <div className="stat-card compact">
              <p>Accuracy</p>
              <h4>{summary.accuracy ?? 0}%</h4>
            </div>
            <div className="stat-card compact">
              <p>Best Score</p>
              <h4>{summary.bestScore ?? 0}</h4>
            </div>
          </div>
          {(summary.strongSubjects?.length > 0 || summary.weakSubjects?.length > 0) && (
            <div className="subject-bands">
              {summary.strongSubjects?.length > 0 && (
                <div className="subject-band strong">
                  <span>💪 Strong: </span>
                  {summary.strongSubjects.map((s) => (
                    <span key={s} className="tag-pill">{s}</span>
                  ))}
                </div>
              )}
              {summary.weakSubjects?.length > 0 && (
                <div className="subject-band weak">
                  <span>📉 Weak: </span>
                  {summary.weakSubjects.map((s) => (
                    <span key={s} className="tag-pill">{s}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </article>
      )}

      <section className="dashboard-layout">
        {/* Available tests */}
        <article className="card panel-left">
          <div className="panel-heading">
            <h2>📋 Available Tests</h2>
            <span className="panel-count">{tests.length} test{tests.length !== 1 ? 's' : ''}</span>
          </div>
          <p className="muted">Start active tests in dedicated exam tabs.</p>
          <div className="stack">
            {tests.length === 0 && (
              <div className="empty-state">
                <p className="muted">No currently active approved tests.</p>
              </div>
            )}
            {tests.map((test) => (
              <div className="test-list-item" key={test._id}>
                <div style={{ flex: 1 }}>
                  <strong>{test.title}</strong>
                  <div className="tags">
                    {test.category && (
                      <span className={`tag-cat ${CATEGORY_COLOR[test.category] || ''}`}>
                        {CATEGORY_LABEL[test.category] || test.category}
                      </span>
                    )}
                    {test.difficultyLevel && <span>{test.difficultyLevel}</span>}
                  </div>
                  <p className="small">
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
              <div className="panel-heading">
                <h3>🎯 Recommended Practice</h3>
              </div>
              <p className="muted small">Based on your weak areas</p>
              <div className="stack">
                {recommendations.map((test) => (
                  <div className="test-list-item" key={test._id}>
                    <div style={{ flex: 1 }}>
                      <strong>{test.title}</strong>
                      <p className="small">⏱ {test.durationMinutes} min · {test.totalMarks} marks</p>
                    </div>
                    <button type="button" onClick={() => openTest(test._id)}>▶ Start</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </article>

        {/* Report navigation */}
        <article className="card panel-right">
          <div className="panel-heading">
            <h2>📈 Reports & Analysis</h2>
          </div>
          <p className="muted">Open every analysis section in separate browser tabs.</p>

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

          <div className="report-nav-grid">
            <button type="button" className="report-nav-btn" onClick={() => openReport('score', 'current')}>
              📊 Score Card
            </button>
            <button type="button" className="report-nav-btn" onClick={() => openReport('subject', 'new')}>
              📚 Subject Report
            </button>
            <button type="button" className="report-nav-btn" onClick={() => openReport('solution', 'new')}>
              ✅ Solutions
            </button>
            <button type="button" className="report-nav-btn" onClick={() => openReport('question', 'new')}>
              🔍 Question Analysis
            </button>
            <button type="button" className="report-nav-btn" onClick={() => openReport('compare', 'new')}>
              📈 Compare Yourself
            </button>
          </div>

          {selectedAttempt && (
            <div className="summary-inline">
              <div>
                <small>Score</small>
                <strong>{selectedAttempt.score}</strong>
              </div>
              <div>
                <small>Total Marks</small>
                <strong>{selectedAttempt.test?.totalMarks || '-'}</strong>
              </div>
              <div>
                <small>Submitted</small>
                <strong>{formatDateTime(selectedAttempt.submittedAt)}</strong>
              </div>
            </div>
          )}

          {/* Attempt history */}
          {attempts.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <h3>🕒 Attempt History</h3>
              <div className="stack">
                {attempts.map((attempt) => (
                  <div className="attempt-history-item" key={attempt._id}>
                    <div>
                      <strong>{attempt.test?.title}</strong>
                      <p className="small">{formatDateTime(attempt.submittedAt)}</p>
                    </div>
                    <div className="attempt-score-badge">
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
