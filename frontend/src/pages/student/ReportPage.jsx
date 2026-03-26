import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import { goTo } from '../../router';
import ReportShell from './report/ReportShell';
import ScoreCardPage from './report/ScoreCardPage';
import SubjectReportPage from './report/SubjectReportPage';
import SolutionReportPage from './report/SolutionReportPage';
import QuestionReportPage from './report/QuestionReportPage';
import ComparePage from './report/ComparePage';

export default function ReportPage({ token, tab, initialTestId, setMessage }) {
  const [attempts, setAttempts] = useState([]);
  const [testId, setTestId] = useState(initialTestId || '');
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    loadAttempts();
  }, [token]);

  useEffect(() => {
    if (!testId) return;
    loadAnalysis(testId);
  }, [testId]);

  async function loadAttempts() {
    try {
      const data = await api.getMyAttempts(token);
      const list = data.attempts || [];
      setAttempts(list);

      const nextTestId = initialTestId || list[0]?.test?._id || '';
      if (!nextTestId) {
        setMessage('No attempts found yet. Take a test first.');
        return;
      }
      setTestId(String(nextTestId));
      if (!initialTestId) {
        goTo(`/report/${tab}/${nextTestId}`);
      }
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadAnalysis(nextTestId) {
    try {
      const data = await api.getAnalysis(token, nextTestId);
      setAnalysis(data);
    } catch (error) {
      setMessage(error.message);
    }
  }

  const selectedAttempt = useMemo(
    () => attempts.find((a) => String(a.test?._id) === String(testId)),
    [attempts, testId]
  );

  function onChangeTest(nextId) {
    setTestId(nextId);
    goTo(`/report/${tab}/${nextId}`);
  }

  function renderTabContent() {
    if (!analysis) {
      return <div className="bg-white border border-[var(--line)] rounded-2xl p-4 shadow-[0_16px_40px_rgba(21,29,43,0.08)]"><p className="text-[var(--muted)] m-0">Loading analysis...</p></div>;
    }

    if (tab === 'subject') return <SubjectReportPage analysis={analysis} />;
    if (tab === 'solution') return <SolutionReportPage analysis={analysis} />;
    if (tab === 'question') return <QuestionReportPage analysis={analysis} />;
    if (tab === 'compare') return <ComparePage analysis={analysis} />;
    return <ScoreCardPage analysis={analysis} />;
  }

  return (
    <ReportShell
      title="Test Report"
      tab={tab}
      testId={testId}
      testName={selectedAttempt?.test?.title || analysis?.test?.title || 'Report'}
      onChangeTest={onChangeTest}
      attempts={attempts}
    >
      {renderTabContent()}
    </ReportShell>
  );
}
