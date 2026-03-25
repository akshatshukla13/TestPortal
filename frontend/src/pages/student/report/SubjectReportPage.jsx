export default function SubjectReportPage({ analysis }) {
  const s = analysis.summary;
  const b = analysis.benchmark;

  return (
    <section className="stack">
      <div className="stats-grid score-top-grid">
        <div className="stat-card"><p>Total Candidates</p><h3>{b.totalAttempts}</h3></div>
        <div className="stat-card"><p>Total Questions</p><h3>{analysis.test.totalQuestions}</h3></div>
        <div className="stat-card"><p>Total Marks</p><h3>{analysis.test.totalMarks}</h3></div>
        <div className="stat-card"><p>Total Test Duration</p><h3>{analysis.test.durationMinutes} min</h3></div>
      </div>

      <div className="chart-box">
        <h3>Time Management</h3>
        <table className="review-table">
          <thead>
            <tr>
              <th>Subject Name</th>
              <th>Attempts</th>
              <th>Incorrect</th>
              <th>Percentage</th>
              <th>Score and Time</th>
              <th>Topper Performance</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Computer Engineering</td>
              <td>{s.attempted}</td>
              <td>{s.incorrect}</td>
              <td>{s.percentage}%</td>
              <td>{s.score} / {analysis.timing.durationSeconds}s</td>
              <td>{b.topperScore} / {analysis.benchmark.topScores?.[0]?.durationSeconds || 0}s</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="chart-box">
        <h3>Subject Analysis</h3>
        <div className="kv-list">
          <div><span>Scored Marks</span><strong>{s.score}</strong></div>
          <div><span>Percentage</span><strong>{s.percentage}%</strong></div>
          <div><span>Subject Rank</span><strong>{b.rank}</strong></div>
          <div><span>Total Marks</span><strong>{analysis.test.totalMarks}</strong></div>
          <div><span>Topper Score</span><strong>{b.topperScore}</strong></div>
        </div>
      </div>
    </section>
  );
}
