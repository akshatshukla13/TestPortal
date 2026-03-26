export default function ScoreCardPage({ analysis }) {
  const s = analysis.summary;
  const b = analysis.benchmark;

  return (
    <section className="grid gap-3">
      <div className="grid grid-cols-4 gap-2.5">
        <div className="border border-[var(--line)] rounded-xl p-2.5 bg-white"><p className="m-0 text-[var(--muted)] text-[0.82rem]">Total Candidates</p><h3 className="mt-1 mb-0">{b.totalAttempts}</h3></div>
        <div className="border border-[var(--line)] rounded-xl p-2.5 bg-white"><p className="m-0 text-[var(--muted)] text-[0.82rem]">Total Questions</p><h3 className="mt-1 mb-0">{analysis.test.totalQuestions}</h3></div>
        <div className="border border-[var(--line)] rounded-xl p-2.5 bg-white"><p className="m-0 text-[var(--muted)] text-[0.82rem]">Total Marks</p><h3 className="mt-1 mb-0">{analysis.test.totalMarks}</h3></div>
        <div className="border border-[var(--line)] rounded-xl p-2.5 bg-white"><p className="m-0 text-[var(--muted)] text-[0.82rem]">Total Duration</p><h3 className="mt-1 mb-0">{analysis.test.durationMinutes} min</h3></div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="border border-[var(--line)] rounded-xl p-2.5">
          <h3 className="mt-0">Summary</h3>
          <div className="grid gap-1.5 mb-3">
            <div className="flex justify-between border-b border-[var(--line)] pb-1"><span>Marks from correct</span><strong>{s.positiveMarks}</strong></div>
            <div className="flex justify-between border-b border-[var(--line)] pb-1"><span>Marks from incorrect</span><strong>{s.negativeMarks}</strong></div>
            <div className="flex justify-between border-b border-[var(--line)] pb-1"><span>Attempted Questions</span><strong>{s.attempted}</strong></div>
            <div className="flex justify-between border-b border-[var(--line)] pb-1"><span>Unattempted Questions</span><strong>{s.unattempted}</strong></div>
          </div>
          <div className="grid grid-cols-4 gap-2.5">
            <div className="border border-[var(--line)] rounded-xl p-2.5 bg-white"><p className="m-0 text-[var(--muted)] text-[0.82rem]">Rank</p><h4 className="text-[1.12rem] mt-1 mb-0">{b.rank}</h4></div>
            <div className="border border-[var(--line)] rounded-xl p-2.5 bg-white"><p className="m-0 text-[var(--muted)] text-[0.82rem]">Score</p><h4 className="text-[1.12rem] mt-1 mb-0">{s.score}</h4></div>
            <div className="border border-[var(--line)] rounded-xl p-2.5 bg-white"><p className="m-0 text-[var(--muted)] text-[0.82rem]">Percent</p><h4 className="text-[1.12rem] mt-1 mb-0">{s.percentage}%</h4></div>
            <div className="border border-[var(--line)] rounded-xl p-2.5 bg-white"><p className="m-0 text-[var(--muted)] text-[0.82rem]">Percentile</p><h4 className="text-[1.12rem] mt-1 mb-0">{b.percentile}</h4></div>
          </div>
        </div>

        <div className="border border-[var(--line)] rounded-xl p-2.5">
          <h3 className="mt-0">Difficulty V/S Question Distribution</h3>
          <div className="grid grid-cols-[70px_1fr_50px] items-center gap-2 mb-1.5">
            <span>Beginner</span>
            <div className="h-2.5 rounded-full bg-[#eef2f6] overflow-hidden"><div className="h-full rounded-full bg-emerald-500" style={{ width: '100%' }} /></div>
            <strong>{analysis.test.totalQuestions}</strong>
          </div>
          <div className="grid grid-cols-[70px_1fr_50px] items-center gap-2 mb-1.5">
            <span>Medium</span>
            <div className="h-2.5 rounded-full bg-[#eef2f6] overflow-hidden"><div className="h-full rounded-full bg-blue-500" style={{ width: '0%' }} /></div>
            <strong>0</strong>
          </div>
          <div className="grid grid-cols-[70px_1fr_50px] items-center gap-2 mb-1.5">
            <span>Advanced</span>
            <div className="h-2.5 rounded-full bg-[#eef2f6] overflow-hidden"><div className="h-full rounded-full bg-amber-400" style={{ width: '0%' }} /></div>
            <strong>0</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
