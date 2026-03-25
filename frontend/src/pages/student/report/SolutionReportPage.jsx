export default function SolutionReportPage({ analysis }) {
  return (
    <section className="stack">
      {analysis.questionAnalysis.map((q, index) => (
        <article className="chart-box" key={q.questionId}>
          <h3>
            Question {index + 1} ({q.questionId})
          </h3>
          <p>{q.questionText}</p>
          {q.questionImage && <img className="solution-image" src={q.questionImage} alt={`Q${index + 1}`} />}

          <div className="stack">
            {q.options.map((option) => (
              <div key={option.id} className="option-line">
                <strong>{option.id}.</strong> <span>{option.text}</span>
              </div>
            ))}
          </div>

          <div className="solution-meta">
            <span>Your Answer: {q.selectedOptionId || '-'}</span>
            <span>Correct Answer: {q.correctOptionId || '-'}</span>
            <span className={q.isCorrect ? 'good' : 'bad'}>{q.isCorrect ? 'Correct' : 'Incorrect'}</span>
          </div>

          <div className="solution-box">
            <h4>Solution</h4>
            <p>{q.solution?.text || 'No explanation available.'}</p>
            {q.solution?.image && <img className="solution-image" src={q.solution.image} alt="Solution" />}
          </div>
        </article>
      ))}
    </section>
  );
}
