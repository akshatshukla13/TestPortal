import { formatSeconds } from '../../../utils/format';

export default function QuestionReportPage({ analysis }) {
  return (
    <section className="chart-box">
      <h3>Question Report</h3>
      <div className="review-table-wrap">
        <table className="review-table">
          <thead>
            <tr>
              <th>S.No.</th>
              <th>Status</th>
              <th>Correct Answer</th>
              <th>Your Answer</th>
              <th>Your Score</th>
              <th>Attempt (%)</th>
              <th>Accuracy (%)</th>
              <th>Avg. Time</th>
              <th>Topper's Score</th>
              <th>Topper's Time</th>
              <th>Difficulty</th>
            </tr>
          </thead>
          <tbody>
            {analysis.questionAnalysis.map((q, idx) => (
              <tr key={q.questionId}>
                <td>{idx + 1}</td>
                <td>{q.isCorrect ? 'Correct' : q.selectedOptionId ? 'Incorrect' : 'Skipped'}</td>
                <td>{q.correctOptionId || '-'}</td>
                <td>{q.selectedOptionId || '-'}</td>
                <td>{q.marksAwarded}</td>
                <td>{q.attemptRate.toFixed(2)}</td>
                <td>{q.accuracyRate.toFixed(2)}</td>
                <td>{formatSeconds(q.avgTimeSeconds)}</td>
                <td>{q.topperScore}</td>
                <td>{formatSeconds(q.topperTimeSeconds)}</td>
                <td>{q.difficulty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
