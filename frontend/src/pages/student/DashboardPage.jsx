import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import { formatDateTime } from '../../utils/format';
import { goTo, openInNewTab } from '../../router';

export default function DashboardPage({ token, setMessage }) {
  const [tests, setTests] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [selectedAttemptId, setSelectedAttemptId] = useState('');

  const selectedAttempt = useMemo(
    () => attempts.find((a) => String(a._id) === String(selectedAttemptId)) || attempts[0],
    [attempts, selectedAttemptId]
  );

  useEffect(() => {
    loadData();
  }, [token]);

  async function loadData() {
    try {
      const [testsData, attemptsData] = await Promise.all([
        api.getAvailableTests(token),
        api.getMyAttempts(token),
      ]);
      setTests(testsData.tests || []);
      setAttempts(attemptsData.attempts || []);
      if (attemptsData.attempts?.length) {
        setSelectedAttemptId(String(attemptsData.attempts[0]._id));
      }
    } catch (error) {
      setMessage(error.message);
    }
  }

  function openTest(testId) {
    openInNewTab(`/test/${testId}`);
    setMessage('Test opened in new secure browser tab.');
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
    <section className="dashboard-layout">
      <article className="card panel-left">
        <h2>My Test</h2>
        <p className="muted">Start active tests in dedicated exam tabs.</p>
        <div className="stack">
          {tests.length === 0 && <p className="muted">No currently active approved tests.</p>}
          {tests.map((test) => (
            <div className="test-list-item" key={test._id}>
              <div>
                <strong>{test.title}</strong>
                <p className="small">
                  {test.durationMinutes} mins | {test.questions?.length || 0} questions
                </p>
              </div>
              <button type="button" onClick={() => openTest(test._id)}>
                Start In New Tab
              </button>
            </div>
          ))}
        </div>
      </article>

      <article className="card panel-right">
        <h2>Report Navigation</h2>
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
                {attempt.test?.title} | Score {attempt.score} | {formatDateTime(attempt.submittedAt)}
              </option>
            ))}
          </select>
        </label>

        <div className="report-nav-grid">
          <button type="button" onClick={() => openReport('score', 'current')}>
            Score Card
          </button>
          <button type="button" onClick={() => openReport('subject', 'new')}>
            Subject Report (New Tab)
          </button>
          <button type="button" onClick={() => openReport('solution', 'new')}>
            Solution Report (New Tab)
          </button>
          <button type="button" onClick={() => openReport('question', 'new')}>
            Question Report (New Tab)
          </button>
          <button type="button" onClick={() => openReport('compare', 'new')}>
            Compare Yourself (New Tab)
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
      </article>
    </section>
  );
}
