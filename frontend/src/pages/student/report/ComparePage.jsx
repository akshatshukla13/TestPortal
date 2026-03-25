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
    <section className="stack">
      <div className="score-main-grid compare-grid-3">
        <div className="chart-box">
          <h3>Time Comparison</h3>
          <div className="dist-row">
            <span>You</span>
            <div className="bar-wrap"><div className="bar low" style={{ width: `${Math.min(100, (yourTime / Math.max(1, yourTime, avgTime, topperTime)) * 100)}%` }} /></div>
            <strong>{formatSeconds(yourTime)}</strong>
          </div>
          <div className="dist-row">
            <span>Average</span>
            <div className="bar-wrap"><div className="bar mid" style={{ width: `${Math.min(100, (avgTime / Math.max(1, yourTime, avgTime, topperTime)) * 100)}%` }} /></div>
            <strong>{formatSeconds(avgTime)}</strong>
          </div>
          <div className="dist-row">
            <span>Topper</span>
            <div className="bar-wrap"><div className="bar high" style={{ width: `${Math.min(100, (topperTime / Math.max(1, yourTime, avgTime, topperTime)) * 100)}%` }} /></div>
            <strong>{formatSeconds(topperTime)}</strong>
          </div>
        </div>

        <div className="chart-box">
          <h3>Score Comparison</h3>
          <div className="dist-row">
            <span>You</span>
            <div className="bar-wrap"><div className="bar low" style={{ width: `${(analysis.summary.score / Math.max(1, analysis.test.totalMarks)) * 100}%` }} /></div>
            <strong>{analysis.summary.score}</strong>
          </div>
          <div className="dist-row">
            <span>Average</span>
            <div className="bar-wrap"><div className="bar mid" style={{ width: `${(analysis.benchmark.averageScore / Math.max(1, analysis.test.totalMarks)) * 100}%` }} /></div>
            <strong>{analysis.benchmark.averageScore}</strong>
          </div>
          <div className="dist-row">
            <span>Topper</span>
            <div className="bar-wrap"><div className="bar high" style={{ width: `${(analysis.benchmark.topperScore / Math.max(1, analysis.test.totalMarks)) * 100}%` }} /></div>
            <strong>{analysis.benchmark.topperScore}</strong>
          </div>
        </div>

        <div className="chart-box">
          <h3>Accuracy Comparison</h3>
          <div className="dist-row">
            <span>You</span>
            <div className="bar-wrap"><div className="bar low" style={{ width: `${Math.min(100, yourAccuracy)}%` }} /></div>
            <strong>{yourAccuracy.toFixed(2)}%</strong>
          </div>
          <div className="dist-row">
            <span>Average</span>
            <div className="bar-wrap"><div className="bar mid" style={{ width: `${Math.min(100, averageAccuracy)}%` }} /></div>
            <strong>{averageAccuracy.toFixed(2)}%</strong>
          </div>
          <div className="dist-row">
            <span>Topper</span>
            <div className="bar-wrap"><div className="bar high" style={{ width: `${Math.min(100, Number(topperAccuracy))}%` }} /></div>
            <strong>{topperAccuracy}%</strong>
          </div>
        </div>
      </div>

      <div className="chart-box">
        <h3>Comparison Of First Ten Toppers</h3>
        <div className="top10-grid">
          {analysis.benchmark.topScores.map((item) => (
            <div key={item.rank} className="top10-item">
              <div className="top10-bar" style={{ height: `${Math.max(14, (item.score / Math.max(1, analysis.test.totalMarks)) * 120)}px` }} />
              <small>{item.rank}th</small>
              <strong>{item.score}</strong>
            </div>
          ))}
          <div className="top10-item you">
            <div className="top10-bar" style={{ height: `${Math.max(14, (analysis.summary.score / Math.max(1, analysis.test.totalMarks)) * 120)}px` }} />
            <small>YOU</small>
            <strong>{analysis.summary.score}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
