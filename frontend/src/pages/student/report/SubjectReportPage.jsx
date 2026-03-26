export default function SubjectReportPage({ analysis }) {
  const s = analysis.summary;
  const b = analysis.benchmark;

  return (
    <section className="grid gap-3">
      <div className="grid grid-cols-4 gap-2.5">
        <div className="border border-[var(--line)] rounded-xl p-2.5 bg-white"><p className="m-0 text-[var(--muted)] text-[0.82rem]">Total Candidates</p><h3 className="mt-1 mb-0">{b.totalAttempts}</h3></div>
        <div className="border border-[var(--line)] rounded-xl p-2.5 bg-white"><p className="m-0 text-[var(--muted)] text-[0.82rem]">Total Questions</p><h3 className="mt-1 mb-0">{analysis.test.totalQuestions}</h3></div>
        <div className="border border-[var(--line)] rounded-xl p-2.5 bg-white"><p className="m-0 text-[var(--muted)] text-[0.82rem]">Total Marks</p><h3 className="mt-1 mb-0">{analysis.test.totalMarks}</h3></div>
        <div className="border border-[var(--line)] rounded-xl p-2.5 bg-white"><p className="m-0 text-[var(--muted)] text-[0.82rem]">Total Test Duration</p><h3 className="mt-1 mb-0">{analysis.test.durationMinutes} min</h3></div>
      </div>

      <div className="border border-[var(--line)] rounded-xl p-2.5">
        <h3 className="mt-0">Time Management</h3>
        <div className="border border-[var(--line)] rounded-xl p-2.5 overflow-auto">
          <table className="w-full border-collapse min-w-[560px]">
            <thead>
              <tr>
                <th className="border-b border-[var(--line)] p-[0.45rem] text-left text-[0.92rem]">Subject Name</th>
                <th className="border-b border-[var(--line)] p-[0.45rem] text-left text-[0.92rem]">Attempts</th>
                <th className="border-b border-[var(--line)] p-[0.45rem] text-left text-[0.92rem]">Incorrect</th>
                <th className="border-b border-[var(--line)] p-[0.45rem] text-left text-[0.92rem]">Percentage</th>
                <th className="border-b border-[var(--line)] p-[0.45rem] text-left text-[0.92rem]">Score and Time</th>
                <th className="border-b border-[var(--line)] p-[0.45rem] text-left text-[0.92rem]">Topper Performance</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border-b border-[var(--line)] p-[0.45rem] text-[0.92rem]">Computer Engineering</td>
                <td className="border-b border-[var(--line)] p-[0.45rem] text-[0.92rem]">{s.attempted}</td>
                <td className="border-b border-[var(--line)] p-[0.45rem] text-[0.92rem]">{s.incorrect}</td>
                <td className="border-b border-[var(--line)] p-[0.45rem] text-[0.92rem]">{s.percentage}%</td>
                <td className="border-b border-[var(--line)] p-[0.45rem] text-[0.92rem]">{s.score} / {analysis.timing.durationSeconds}s</td>
                <td className="border-b border-[var(--line)] p-[0.45rem] text-[0.92rem]">{b.topperScore} / {analysis.benchmark.topScores?.[0]?.durationSeconds || 0}s</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="border border-[var(--line)] rounded-xl p-2.5">
        <h3 className="mt-0">Subject Analysis</h3>
        <div className="grid gap-1.5 mb-3">
          <div className="flex justify-between border-b border-[var(--line)] pb-1"><span>Scored Marks</span><strong>{s.score}</strong></div>
          <div className="flex justify-between border-b border-[var(--line)] pb-1"><span>Percentage</span><strong>{s.percentage}%</strong></div>
          <div className="flex justify-between border-b border-[var(--line)] pb-1"><span>Subject Rank</span><strong>{b.rank}</strong></div>
          <div className="flex justify-between border-b border-[var(--line)] pb-1"><span>Total Marks</span><strong>{analysis.test.totalMarks}</strong></div>
          <div className="flex justify-between border-b border-[var(--line)] pb-1"><span>Topper Score</span><strong>{b.topperScore}</strong></div>
        </div>
      </div>
    </section>
  );
}
