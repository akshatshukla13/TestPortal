import { useState } from 'react';

function getBookmarks() {
  try {
    return JSON.parse(localStorage.getItem('bookmarked-questions') || '{}');
  } catch {
    return {};
  }
}

function saveBookmarks(bookmarks) {
  localStorage.setItem('bookmarked-questions', JSON.stringify(bookmarks));
}

function isAttempted(item) {
  return (
    Boolean(item.selectedOptionId) ||
    Boolean((item.selectedOptionIds || []).length) ||
    (item.numericAnswer !== null && item.numericAnswer !== undefined)
  );
}

function paletteBtnClass(item, index, currentIndex) {
  const status = item.isCorrect ? 'sol-correct' : isAttempted(item) ? 'sol-incorrect' : 'sol-skipped';
  const current = index === currentIndex ? 'sol-current' : '';
  return ['sol-palette-btn', status, current].filter(Boolean).join(' ');
}

function statusBadgeClass(q) {
  const status = q.isCorrect ? 'sol-correct' : isAttempted(q) ? 'sol-incorrect' : 'sol-skipped';
  return ['sol-status-badge', status].join(' ');
}

export default function SolutionReportPage({ analysis }) {
  const questions = analysis.questionAnalysis;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [bookmarks, setBookmarks] = useState(getBookmarks);

  function toggleBookmark(qId) {
    setBookmarks((prev) => {
      const next = { ...prev };
      if (next[qId]) delete next[qId];
      else next[qId] = true;
      saveBookmarks(next);
      return next;
    });
  }

  if (!questions.length) {
    return <p className="text-[var(--muted)] m-0">No question data available.</p>;
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
    <section className="grid gap-3">
      {/* Question palette strip */}
      <div className="flex flex-wrap gap-1.5 p-2.5 bg-[var(--card-soft)] border border-[var(--line)] rounded-xl">
        {questions.map((item, index) => (
          <button
            key={item.questionId}
            type="button"
            className={paletteBtnClass(item, index, currentIndex)}
            onClick={() => jumpTo(index)}
            title={`Q${index + 1}: ${item.isCorrect ? 'Correct' : isAttempted(item) ? 'Incorrect' : 'Skipped'}`}
          >
            {index + 1}
          </button>
        ))}
      </div>

      {/* Single question view */}
      <article className="border border-[var(--line)] rounded-xl p-2.5 grid gap-3.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="inline-flex items-center rounded-full border border-[var(--line)] px-2 py-0.5 text-xs bg-white">Question {currentIndex + 1} / {questions.length}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              title={bookmarks[q.questionId] ? 'Remove bookmark' : 'Add bookmark'}
              className={`secondary px-2.5 py-1.5 rounded-xl text-base${bookmarks[q.questionId] ? ' bg-amber-50 border-amber-300 text-amber-600' : ''}`}
              onClick={() => toggleBookmark(q.questionId)}
            >
              {bookmarks[q.questionId] ? '🔖' : '☆'}
            </button>
            <span className={`${statusBadgeClass(q)} inline-flex items-center rounded-full py-[0.22rem] px-[0.7rem] text-[0.82rem] font-bold border border-transparent`}>
              {q.isCorrect ? '✓ Correct' : isAttempted(q) ? '✗ Incorrect' : '— Skipped'}
            </span>
          </div>
        </div>

        <p className="text-[1.05rem] leading-[1.7] m-0 whitespace-pre-wrap">{q.questionText}</p>
        {q.questionImage && (
          <img className="max-w-full border border-[var(--line)] rounded-xl" src={q.questionImage} alt={`Q${currentIndex + 1}`} />
        )}

        <div className="grid gap-2">
          {q.type === 'NAT' ? null : (
            q.options.map((option) => {
              const isCorrect = q.type === 'MSQ'
                ? (q.correctOptionIds || []).includes(option.id)
                : option.id === q.correctOptionId;
              const isSelected = q.type === 'MSQ'
                ? (q.selectedOptionIds || []).includes(option.id)
                : option.id === q.selectedOptionId;
              let cls = 'sol-option flex items-start gap-2 border border-[var(--line)] rounded-xl px-3 py-2 bg-white text-[0.95rem]';
              if (isCorrect) cls += ' sol-opt-correct';
              else if (isSelected) cls += ' sol-opt-wrong';
              return (
                <div key={option.id} className={cls}>
                  <span className="font-bold flex-shrink-0 min-w-[1.4rem]">{option.id}.</span>
                  <span>{option.text}</span>
                  {isCorrect && <span className="ml-auto text-xs font-bold px-[0.4rem] py-[0.1rem] rounded-full whitespace-nowrap bg-[#dcfce7] text-[#14532d]">✓ Correct</span>}
                  {isSelected && !isCorrect && <span className="ml-auto text-xs font-bold px-[0.4rem] py-[0.1rem] rounded-full whitespace-nowrap bg-[#fee2e2] text-[#7f1d1d]">✗ Your Answer</span>}
                </div>
              );
            })
          )}
        </div>

        <div className="flex gap-4 flex-wrap text-sm p-2.5 bg-[var(--card-soft)] rounded-xl border border-[var(--line)]">
          {q.type === 'NAT' ? (
            <>
              <span>Your Answer: <strong>{q.numericAnswer !== null && q.numericAnswer !== undefined ? q.numericAnswer : '—'}</strong></span>
              <span>Correct Answer: <strong>{q.correctNumericalAnswer !== null && q.correctNumericalAnswer !== undefined ? q.correctNumericalAnswer : '—'}</strong></span>
            </>
          ) : q.type === 'MSQ' ? (
            <>
              <span>Your Answer: <strong>{(q.selectedOptionIds || []).length ? q.selectedOptionIds.join(', ') : '—'}</strong></span>
              <span>Correct Answer: <strong>{(q.correctOptionIds || []).length ? q.correctOptionIds.join(', ') : '—'}</strong></span>
            </>
          ) : (
            <>
              <span>Your Answer: <strong>{q.selectedOptionId || '—'}</strong></span>
              <span>Correct Answer: <strong>{q.correctOptionId || '—'}</strong></span>
            </>
          )}
          <span>Marks: <strong className={q.marksAwarded >= 0 ? 'good' : 'bad'}>{q.marksAwarded >= 0 ? `+${q.marksAwarded}` : q.marksAwarded}</strong></span>
        </div>

        <div className="border border-dashed border-[var(--line)] rounded-xl p-2.5 mt-2">
          <h4>📖 Explanation</h4>
          <p>{q.solution?.text || 'No explanation available.'}</p>
          {q.solution?.image && (
            <img className="max-w-full border border-[var(--line)] rounded-xl" src={q.solution.image} alt="Solution" />
          )}
        </div>

        {/* Prev / Next navigation */}
        <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-[var(--line)] mt-1.5">
          <button
            type="button"
            className="secondary"
            onClick={goPrev}
            disabled={currentIndex === 0}
          >
            ← Previous
          </button>
          <span className="text-sm text-[var(--muted)] font-semibold">{currentIndex + 1} / {questions.length}</span>
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
