import { useState } from 'react';

function paletteBtnClass(item, index, currentIndex) {
  const status = item.isCorrect ? 'sol-correct' : item.selectedOptionId ? 'sol-incorrect' : 'sol-skipped';
  const current = index === currentIndex ? 'sol-current' : '';
  return ['sol-palette-btn', status, current].filter(Boolean).join(' ');
}

function statusBadgeClass(q) {
  const status = q.isCorrect ? 'sol-correct' : q.selectedOptionId ? 'sol-incorrect' : 'sol-skipped';
  return ['sol-status-badge', status].join(' ');
}

export default function SolutionReportPage({ analysis }) {
  const questions = analysis.questionAnalysis;
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!questions.length) {
    return <p className="muted">No question data available.</p>;
  }

  const q = questions[currentIndex];

  function goPrev() {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }

  function goNext() {
    setCurrentIndex((i) => Math.min(questions.length - 1, i + 1));
  }

  function jumpTo(index) {
    setCurrentIndex(index);
  }

  return (
    <section className="solution-paged">
      {/* Question palette strip */}
      <div className="solution-palette">
        {questions.map((item, index) => (
          <button
            key={item.questionId}
            type="button"
            className={paletteBtnClass(item, index, currentIndex)}
            onClick={() => jumpTo(index)}
            title={`Q${index + 1}: ${item.isCorrect ? 'Correct' : item.selectedOptionId ? 'Incorrect' : 'Skipped'}`}
          >
            {index + 1}
          </button>
        ))}
      </div>

      {/* Single question view */}
      <article className="chart-box solution-card">
        <div className="sol-q-header">
          <span className="pill">Question {currentIndex + 1} / {questions.length}</span>
          <span className={statusBadgeClass(q)}>
            {q.isCorrect ? '✓ Correct' : q.selectedOptionId ? '✗ Incorrect' : '— Skipped'}
          </span>
        </div>

        <p className="sol-q-text">{q.questionText}</p>
        {q.questionImage && (
          <img className="solution-image" src={q.questionImage} alt={`Q${currentIndex + 1}`} />
        )}

        <div className="sol-options">
          {q.options.map((option) => {
            const isCorrect = option.id === q.correctOptionId;
            const isSelected = option.id === q.selectedOptionId;
            let cls = 'sol-option';
            if (isCorrect) cls += ' sol-opt-correct';
            else if (isSelected && !isCorrect) cls += ' sol-opt-wrong';
            return (
              <div key={option.id} className={cls}>
                <span className="sol-opt-label">{option.id}.</span>
                <span>{option.text}</span>
                {isCorrect && <span className="sol-opt-tag sol-tag-correct">✓ Correct</span>}
                {isSelected && !isCorrect && <span className="sol-opt-tag sol-tag-wrong">✗ Your Answer</span>}
              </div>
            );
          })}
        </div>

        <div className="sol-answer-row">
          <span>Your Answer: <strong>{q.selectedOptionId || '—'}</strong></span>
          <span>Correct Answer: <strong>{q.correctOptionId || '—'}</strong></span>
          <span>Marks: <strong className={q.marksAwarded >= 0 ? 'good' : 'bad'}>{q.marksAwarded >= 0 ? `+${q.marksAwarded}` : q.marksAwarded}</strong></span>
        </div>

        <div className="solution-box">
          <h4>📖 Explanation</h4>
          <p>{q.solution?.text || 'No explanation available.'}</p>
          {q.solution?.image && (
            <img className="solution-image" src={q.solution.image} alt="Solution" />
          )}
        </div>

        {/* Prev / Next navigation */}
        <div className="sol-nav-row">
          <button
            type="button"
            className="secondary"
            onClick={goPrev}
            disabled={currentIndex === 0}
          >
            ← Previous
          </button>
          <span className="sol-nav-counter">{currentIndex + 1} / {questions.length}</span>
          <button
            type="button"
            onClick={goNext}
            disabled={currentIndex === questions.length - 1}
          >
            Next →
          </button>
        </div>
      </article>
    </section>
  );
}
