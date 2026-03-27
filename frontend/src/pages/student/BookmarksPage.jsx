import { useEffect, useState } from 'react';
import { api } from '../../api';
import Card from '../../components/ui/Card';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';

export default function BookmarksPage({ token }) {
  const [attempts, setAttempts] = useState([]);
  const [bookmarks, setBookmarks] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('bookmarked-questions') || '{}');
    } catch {
      return {};
    }
  });
  const [selectedTest, setSelectedTest] = useState('');
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    api
      .getMyAttempts(token)
      .then((res) => {
        const list = res.attempts || [];
        setAttempts(list);
        if (list.length) {
          setSelectedTest(String(list[0].test?._id || ''));
        }
      })
      .catch(console.error);
  }, [token]);

  useEffect(() => {
    if (!selectedTest) return;
    api
      .getAnalysis(token, selectedTest)
      .then((data) => {
        setQuestions(data.questionAnalysis || []);
      })
      .catch(console.error);
  }, [token, selectedTest]);

  function toggleBookmark(qId) {
    setBookmarks((prev) => {
      const next = { ...prev };
      if (next[qId]) {
        delete next[qId];
      } else {
        next[qId] = true;
      }
      localStorage.setItem('bookmarked-questions', JSON.stringify(next));
      return next;
    });
  }

  const bookmarkedQs = questions.filter((q) => bookmarks[q.questionId]);
  const unbookmarkedQs = questions.filter((q) => !bookmarks[q.questionId]);
  const displayQs = bookmarkedQs.length > 0 ? bookmarkedQs : questions;

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Bookmarks"
        subtitle="Save and review important questions from your tests."
      />

      {/* Filters */}
      <Card className="p-3 flex flex-wrap gap-3 items-center">
        <label className="flex items-center gap-2 text-sm font-semibold">
          Test
          <select
            value={selectedTest}
            onChange={(e) => setSelectedTest(e.target.value)}
            className="text-sm"
          >
            {attempts.map((a) => (
              <option key={a._id} value={a.test?._id || ''}>
                {a.test?.title}
              </option>
            ))}
          </select>
        </label>
        {bookmarkedQs.length > 0 && (
          <span className="text-xs text-[var(--muted)]">
            Showing {bookmarkedQs.length} bookmarked question{bookmarkedQs.length !== 1 ? 's' : ''}
          </span>
        )}
      </Card>

      {/* Question cards */}
      {displayQs.length === 0 && <EmptyState message="No questions to display. Select a test above." />}

      <div className="grid gap-3">
        {displayQs.map((q, idx) => {
          const isBookmarked = !!bookmarks[q.questionId];
          return (
            <Card key={q.questionId} className="p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <span className="inline-flex items-center rounded-full border border-[var(--line)] px-2 py-0.5 text-xs bg-[var(--card-soft)]">
                  Q{idx + 1}
                </span>
                <button
                  type="button"
                  title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                  className={`secondary px-2.5 py-1.5 rounded-xl text-base ${isBookmarked ? 'bg-amber-50 border-amber-300 text-amber-600' : ''}`}
                  onClick={() => toggleBookmark(q.questionId)}
                >
                  {isBookmarked ? '🔖' : '☆'}
                </button>
              </div>

              <p className="text-[1rem] leading-[1.7] mb-3 m-0 whitespace-pre-wrap">{q.questionText}</p>

              <div className="grid gap-2">
                {(q.options || []).map((opt) => {
                  const isCorrect = opt.id === q.correctOptionId;
                  const isSelected = opt.id === q.selectedOptionId;
                  let cls =
                    'flex items-start gap-2 border border-[var(--line)] rounded-xl px-3 py-2 text-sm bg-white';
                  if (isCorrect) cls += ' sol-opt-correct';
                  else if (isSelected && !isCorrect) cls += ' sol-opt-wrong';
                  return (
                    <div key={opt.id} className={cls}>
                      <span className="font-bold flex-shrink-0 min-w-[1.4rem]">{opt.id}.</span>
                      <span>{opt.text}</span>
                      {isCorrect && (
                        <span className="ml-auto text-xs font-bold px-[0.4rem] py-[0.1rem] rounded-full bg-[#dcfce7] text-[#14532d] whitespace-nowrap">
                          ✓ Correct
                        </span>
                      )}
                      {isSelected && !isCorrect && (
                        <span className="ml-auto text-xs font-bold px-[0.4rem] py-[0.1rem] rounded-full bg-[#fee2e2] text-[#7f1d1d] whitespace-nowrap">
                          ✗ Your Answer
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Show all button when filtering by bookmark */}
      {bookmarkedQs.length > 0 && unbookmarkedQs.length > 0 && (
        <button
          type="button"
          className="secondary"
          onClick={() => setBookmarks({})}
        >
          Clear all bookmarks
        </button>
      )}
    </div>
  );
}
