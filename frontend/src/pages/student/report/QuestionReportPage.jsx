import { formatSeconds } from '../../../utils/format';

export default function QuestionReportPage({ analysis }) {
  return (
    <section className="border border-[var(--line)] rounded-xl p-2.5">
      <h3>Question Report</h3>
      <div className="border border-[var(--line)] rounded-xl p-2.5 overflow-auto">
        <table className="w-full border-collapse min-w-[560px]">
          <thead>
            <tr>
              <th className="border-b border-[var(--line)] p-[0.45rem] text-left text-[0.92rem]">S.No.</th>
              <th className="border-b border-[var(--line)] p-[0.45rem] text-left text-[0.92rem]">Status</th>
              <th className="border-b border-[var(--line)] p-[0.45rem] text-left text-[0.92rem]">Correct Answer</th>
              <th className="border-b border-[var(--line)] p-[0.45rem] text-left text-[0.92rem]">Your Answer</th>
              <th className="border-b border-[var(--line)] p-[0.45rem] text-left text-[0.92rem]">Your Score</th>
              <th className="border-b border-[var(--line)] p-[0.45rem] text-left text-[0.92rem]">Attempt (%)</th>
              <th className="border-b border-[var(--line)] p-[0.45rem] text-left text-[0.92rem]">Accuracy (%)</th>
              <th className="border-b border-[var(--line)] p-[0.45rem] text-left text-[0.92rem]">Avg. Time</th>
              <th className="border-b border-[var(--line)] p-[0.45rem] text-left text-[0.92rem]">Topper's Score</th>
              <th className="border-b border-[var(--line)] p-[0.45rem] text-left text-[0.92rem]">Topper's Time</th>
              <th className="border-b border-[var(--line)] p-[0.45rem] text-left text-[0.92rem]">Difficulty</th>
            </tr>
          </thead>
          <tbody>
            {analysis.questionAnalysis.map((q, idx) => (
              <tr key={q.questionId}>
                <td className="border-b border-[var(--line)] p-[0.45rem] text-[0.92rem]">{idx + 1}</td>
                <td className="border-b border-[var(--line)] p-[0.45rem] text-[0.92rem]">{q.isCorrect ? 'Correct' : q.selectedOptionId ? 'Incorrect' : 'Skipped'}</td>
                <td className="border-b border-[var(--line)] p-[0.45rem] text-[0.92rem]">{q.correctOptionId || '-'}</td>
                <td className="border-b border-[var(--line)] p-[0.45rem] text-[0.92rem]">{q.selectedOptionId || '-'}</td>
                <td className="border-b border-[var(--line)] p-[0.45rem] text-[0.92rem]">{q.marksAwarded}</td>
                <td className="border-b border-[var(--line)] p-[0.45rem] text-[0.92rem]">{q.attemptRate.toFixed(2)}</td>
                <td className="border-b border-[var(--line)] p-[0.45rem] text-[0.92rem]">{q.accuracyRate.toFixed(2)}</td>
                <td className="border-b border-[var(--line)] p-[0.45rem] text-[0.92rem]">{formatSeconds(q.avgTimeSeconds)}</td>
                <td className="border-b border-[var(--line)] p-[0.45rem] text-[0.92rem]">{q.topperScore}</td>
                <td className="border-b border-[var(--line)] p-[0.45rem] text-[0.92rem]">{formatSeconds(q.topperTimeSeconds)}</td>
                <td className="border-b border-[var(--line)] p-[0.45rem] text-[0.92rem]">{q.difficulty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
