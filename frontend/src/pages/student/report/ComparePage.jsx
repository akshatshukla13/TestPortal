import { formatSeconds } from '../../../utils/format';

export default function ComparePage({ analysis }) {
  const averageAccuracy = analysis.questionAnalysis.length
    ? analysis.questionAnalysis.reduce((sum, q) => sum + q.accuracyRate, 0) / analysis.questionAnalysis.length
    : 0;

  const yourAccuracy = analysis.summary.accuracy;
  const topperAccuracy = Math.max(averageAccuracy + 20, yourAccuracy).toFixed(2);
  const yourTime = analysis.timing.durationSeconds;
  const avgTime = analysis.benchmark.topScores?.length
    ? Math.round(
        analysis.benchmark.topScores.reduce((sum, item) => sum + item.durationSeconds, 0) /
          analysis.benchmark.topScores.length
      )
    : yourTime;
  const topperTime = analysis.benchmark.topScores?.[0]?.durationSeconds || yourTime;

  return (
    <section className="grid gap-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="border border-[var(--line)] rounded-xl p-2.5">
          <h3 className="mt-0">Time Comparison</h3>
          <div className="grid grid-cols-[70px_1fr_50px] items-center gap-2 mb-1.5">
            <span>You</span>
            <div className="h-2.5 rounded-full bg-[#eef2f6] overflow-hidden"><div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.min(100, (yourTime / Math.max(1, yourTime, avgTime, topperTime)) * 100)}%` }} /></div>
            <strong>{formatSeconds(yourTime)}</strong>
          </div>
          <div className="grid grid-cols-[70px_1fr_50px] items-center gap-2 mb-1.5">
            <span>Average</span>
            <div className="h-2.5 rounded-full bg-[#eef2f6] overflow-hidden"><div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(100, (avgTime / Math.max(1, yourTime, avgTime, topperTime)) * 100)}%` }} /></div>
            <strong>{formatSeconds(avgTime)}</strong>
          </div>
          <div className="grid grid-cols-[70px_1fr_50px] items-center gap-2 mb-1.5">
            <span>Topper</span>
            <div className="h-2.5 rounded-full bg-[#eef2f6] overflow-hidden"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, (topperTime / Math.max(1, yourTime, avgTime, topperTime)) * 100)}%` }} /></div>
            <strong>{formatSeconds(topperTime)}</strong>
          </div>
        </div>

        <div className="border border-[var(--line)] rounded-xl p-2.5">
          <h3 className="mt-0">Score Comparison</h3>
          <div className="grid grid-cols-[70px_1fr_50px] items-center gap-2 mb-1.5">
            <span>You</span>
            <div className="h-2.5 rounded-full bg-[#eef2f6] overflow-hidden"><div className="h-full rounded-full bg-amber-400" style={{ width: `${(analysis.summary.score / Math.max(1, analysis.test.totalMarks)) * 100}%` }} /></div>
            <strong>{analysis.summary.score}</strong>
          </div>
          <div className="grid grid-cols-[70px_1fr_50px] items-center gap-2 mb-1.5">
            <span>Average</span>
            <div className="h-2.5 rounded-full bg-[#eef2f6] overflow-hidden"><div className="h-full rounded-full bg-blue-500" style={{ width: `${(analysis.benchmark.averageScore / Math.max(1, analysis.test.totalMarks)) * 100}%` }} /></div>
            <strong>{analysis.benchmark.averageScore}</strong>
          </div>
          <div className="grid grid-cols-[70px_1fr_50px] items-center gap-2 mb-1.5">
            <span>Topper</span>
            <div className="h-2.5 rounded-full bg-[#eef2f6] overflow-hidden"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${(analysis.benchmark.topperScore / Math.max(1, analysis.test.totalMarks)) * 100}%` }} /></div>
            <strong>{analysis.benchmark.topperScore}</strong>
          </div>
        </div>

        <div className="border border-[var(--line)] rounded-xl p-2.5">
          <h3 className="mt-0">Accuracy Comparison</h3>
          <div className="grid grid-cols-[70px_1fr_50px] items-center gap-2 mb-1.5">
            <span>You</span>
            <div className="h-2.5 rounded-full bg-[#eef2f6] overflow-hidden"><div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.min(100, yourAccuracy)}%` }} /></div>
            <strong>{yourAccuracy.toFixed(2)}%</strong>
          </div>
          <div className="grid grid-cols-[70px_1fr_50px] items-center gap-2 mb-1.5">
            <span>Average</span>
            <div className="h-2.5 rounded-full bg-[#eef2f6] overflow-hidden"><div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(100, averageAccuracy)}%` }} /></div>
            <strong>{averageAccuracy.toFixed(2)}%</strong>
          </div>
          <div className="grid grid-cols-[70px_1fr_50px] items-center gap-2 mb-1.5">
            <span>Topper</span>
            <div className="h-2.5 rounded-full bg-[#eef2f6] overflow-hidden"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, Number(topperAccuracy))}%` }} /></div>
            <strong>{topperAccuracy}%</strong>
          </div>
        </div>
      </div>

      <div className="border border-[var(--line)] rounded-xl p-2.5">
        <h3 className="mt-0">Comparison Of First Ten Toppers</h3>
        <div className="grid grid-cols-11 gap-1.5 items-end">
          {analysis.benchmark.topScores.map((item) => (
            <div key={item.rank} className="text-center">
              <div className="w-6 mx-auto mb-1.5 rounded-t-lg bg-[#4fb286]" style={{ height: `${Math.max(14, (item.score / Math.max(1, analysis.test.totalMarks)) * 120)}px` }} />
              <small>{item.rank}th</small>
              <strong className="block">{item.score}</strong>
            </div>
          ))}
          <div className="text-center">
            <div className="w-6 mx-auto mb-1.5 rounded-t-lg bg-[#ef6461]" style={{ height: `${Math.max(14, (analysis.summary.score / Math.max(1, analysis.test.totalMarks)) * 120)}px` }} />
            <small>YOU</small>
            <strong className="block">{analysis.summary.score}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
