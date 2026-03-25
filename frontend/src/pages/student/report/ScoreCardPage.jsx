export default function ScoreCardPage({ analysis }) {
  const s = analysis.summary;
  const b = analysis.benchmark;

  return (
    <section className="stack">
      <div className="stats-grid score-top-grid">
        <div className="stat-card"><p>Total Candidates</p><h3>{b.totalAttempts}</h3></div>
        <div className="stat-card"><p>Total Questions</p><h3>{analysis.test.totalQuestions}</h3></div>
        <div className="stat-card"><p>Total Marks</p><h3>{analysis.test.totalMarks}</h3></div>
        <div className="stat-card"><p>Total Duration</p><h3>{analysis.test.durationMinutes} min</h3></div>
      </div>

      <div className="score-main-grid">
        <div className="chart-box">
          <h3>Summary</h3>
          <div className="kv-list">
            <div><span>Marks from correct</span><strong>{s.positiveMarks}</strong></div>
            <div><span>Marks from incorrect</span><strong>{s.negativeMarks}</strong></div>
            <div><span>Attempted Questions</span><strong>{s.attempted}</strong></div>
            <div><span>Unattempted Questions</span><strong>{s.unattempted}</strong></div>
          </div>
          <div className="stats-grid">
            <div className="stat-card compact"><p>Rank</p><h4>{b.rank}</h4></div>
            <div className="stat-card compact"><p>Score</p><h4>{s.score}</h4></div>
            <div className="stat-card compact"><p>Percent</p><h4>{s.percentage}%</h4></div>
            <div className="stat-card compact"><p>Percentile</p><h4>{b.percentile}</h4></div>
          </div>
        </div>

        <div className="chart-box">
          <h3>Difficulty V/S Question Distribution</h3>
          <div className="dist-row">
            <span>Beginner</span>
            <div className="bar-wrap"><div className="bar high" style={{ width: '100%' }} /></div>
            <strong>{analysis.test.totalQuestions}</strong>
          </div>
          <div className="dist-row">
            <span>Medium</span>
            <div className="bar-wrap"><div className="bar mid" style={{ width: '0%' }} /></div>
            <strong>0</strong>
          </div>
          <div className="dist-row">
            <span>Advanced</span>
            <div className="bar-wrap"><div className="bar low" style={{ width: '0%' }} /></div>
            <strong>0</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
