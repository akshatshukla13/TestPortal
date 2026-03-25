import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import { formatSeconds } from '../../utils/format';

const SUBMIT_EVENT_KEY = 'test-portal-submitted-at';

export default function ExamPage({ token, testId, setMessage }) {
  const [test, setTest] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [questionTimes, setQuestionTimes] = useState({});
  const [startAt, setStartAt] = useState(Date.now());
  const [endAt, setEndAt] = useState(null);
  const [leftTime, setLeftTime] = useState('00:00');
  const [submitted, setSubmitted] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [antiCheat, setAntiCheat] = useState({
    fullScreenExitCount: 0,
    visibilityHiddenCount: 0,
    blurCount: 0,
    blockedShortcutCount: 0,
    contextMenuCount: 0,
    copyPasteCount: 0,
  });

  const violationScore =
    antiCheat.fullScreenExitCount +
    antiCheat.visibilityHiddenCount +
    antiCheat.blurCount +
    antiCheat.blockedShortcutCount;

  const currentQuestion = useMemo(() => test?.questions?.[currentIndex], [test, currentIndex]);

  useEffect(() => {
    loadTest();
  }, [testId]);

  useEffect(() => {
    if (!test || submitted) return;

    const timer = setInterval(() => {
      setQuestionTimes((prev) => {
        const q = currentQuestion?.id;
        if (!q) return prev;
        return { ...prev, [q]: (prev[q] || 0) + 1 };
      });

      const leftSec = Math.max(0, Math.floor((endAt - Date.now()) / 1000));
      setLeftTime(formatSeconds(leftSec));
      if (leftSec <= 0) {
        clearInterval(timer);
        submitNow(true);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [test, endAt, submitted, currentQuestion?.id]);

  useEffect(() => {
    if (submitted) return;
    if (violationScore >= 8) {
      submitNow(true);
    }
  }, [violationScore, submitted]);

  useEffect(() => {
    if (submitted) return;

    function blockContext(event) {
      event.preventDefault();
      setAntiCheat((p) => ({ ...p, contextMenuCount: p.contextMenuCount + 1 }));
    }

    function blockClipboard(event) {
      event.preventDefault();
      setAntiCheat((p) => ({ ...p, copyPasteCount: p.copyPasteCount + 1 }));
    }

    function onVisibilityChange() {
      if (document.hidden) {
        setAntiCheat((p) => ({ ...p, visibilityHiddenCount: p.visibilityHiddenCount + 1 }));
      }
    }

    function onBlur() {
      setAntiCheat((p) => ({ ...p, blurCount: p.blurCount + 1 }));
    }

    function onFullScreenChange() {
      if (!document.fullscreenElement && test) {
        setAntiCheat((p) => ({ ...p, fullScreenExitCount: p.fullScreenExitCount + 1 }));
      }
    }

    function onKeyDown(event) {
      const key = event.key.toLowerCase();
      const blockedCombo =
        event.key === 'F12' ||
        ((event.ctrlKey || event.metaKey) && ['c', 'v', 'x', 'u', 'p', 's'].includes(key)) ||
        (event.ctrlKey && event.shiftKey && ['i', 'j', 'c'].includes(key));

      if (blockedCombo) {
        event.preventDefault();
        setAntiCheat((p) => ({ ...p, blockedShortcutCount: p.blockedShortcutCount + 1 }));
      }
    }

    function onBeforeUnload(event) {
      event.preventDefault();
      event.returnValue = '';
    }

    document.addEventListener('contextmenu', blockContext);
    document.addEventListener('copy', blockClipboard);
    document.addEventListener('cut', blockClipboard);
    document.addEventListener('paste', blockClipboard);
    document.addEventListener('visibilitychange', onVisibilityChange);
    document.addEventListener('fullscreenchange', onFullScreenChange);
    window.addEventListener('blur', onBlur);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      document.removeEventListener('contextmenu', blockContext);
      document.removeEventListener('copy', blockClipboard);
      document.removeEventListener('cut', blockClipboard);
      document.removeEventListener('paste', blockClipboard);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.removeEventListener('fullscreenchange', onFullScreenChange);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [submitted, test]);

  async function loadTest() {
    try {
      const response = await api.getTestById(token, testId);
      setTest(response.test);
      setCurrentIndex(0);
      const now = Date.now();
      setStartAt(now);
      const durationSec = Number(response.test.durationMinutes || 0) * 60;
      setEndAt(now + durationSec * 1000);
      setLeftTime(formatSeconds(durationSec));
      await enterFullscreen();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function enterFullscreen() {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      setMessage('Please allow fullscreen to continue secure exam mode.');
    }
  }

  function saveAnswer(optionId) {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: optionId }));
  }

  function jumpToQuestion(index) {
    setCurrentIndex(index);
  }

  function statusForQuestion(question) {
    if (answers[question.id]) return 'answered';
    if (question.id === currentQuestion?.id) return 'current';
    return 'unanswered';
  }

  async function submitNow(autoSubmitted = false) {
    if (!test || isSubmitting || submitted) return;

    setIsSubmitting(true);
    try {
      const answersList = Object.entries(answers).map(([questionId, selectedOptionId]) => ({
        questionId,
        selectedOptionId,
      }));

      const durationSeconds = Math.max(0, Math.floor((Date.now() - startAt) / 1000));
      const response = await api.submitTest(token, test._id, {
        answers: answersList,
        durationSeconds,
        antiCheat,
        autoSubmitted,
        questionTimes,
      });

      setSubmitted(response);
      localStorage.setItem(SUBMIT_EVENT_KEY, String(Date.now()));
      setMessage(autoSubmitted ? 'Auto submitted due to timer or violations.' : 'Test submitted.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!test) {
    return (
      <main className="exam-shell">
        <section className="card"><h2>Loading test...</h2></section>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="exam-shell">
        <section className="card exam-complete">
          <h2>Test Submitted</h2>
          <p>
            Score: <strong>{submitted.score}</strong> / {submitted.totalMarks}
          </p>
          <p className="muted">Open dashboard or report tabs to view complete analysis.</p>
          <div className="button-row">
            <button type="button" onClick={() => (window.location.hash = '#/dashboard')}>
              Open Dashboard
            </button>
            <button type="button" className="secondary" onClick={() => window.close()}>
              Close Tab
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="exam-shell">
      <section className="card exam-topbar">
        <div>
          <h2>{test.title}</h2>
          <p className="muted">Secure exam mode enabled.</p>
        </div>
        <div className="exam-meta">
          <span className="pill danger">Violations: {violationScore}</span>
          <span className="pill">Time Left: {leftTime}</span>
          <button type="button" className="secondary" onClick={enterFullscreen}>
            Re-enter Fullscreen
          </button>
        </div>
      </section>

      <section className="exam-grid">
        <article className="card exam-question-view">
          <h3>
            Question {currentIndex + 1}
          </h3>
          <p>{currentQuestion?.question?.text}</p>
          {currentQuestion?.question?.image && <img src={currentQuestion.question.image} alt="Question" />}

          <div className="stack">
            {(currentQuestion?.options || []).map((option) => (
              <label key={option.id} className="option">
                <input
                  type="radio"
                  checked={answers[currentQuestion.id] === option.id}
                  onChange={() => saveAnswer(option.id)}
                />
                <span>{option.id}. {option.text}</span>
              </label>
            ))}
          </div>

          <div className="button-row">
            <button
              type="button"
              className="secondary"
              onClick={() => setCurrentIndex((v) => Math.max(0, v - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => setCurrentIndex((v) => Math.min((test.questions?.length || 1) - 1, v + 1))}
            >
              Next
            </button>
            <button type="button" onClick={() => submitNow(false)} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Test'}
            </button>
          </div>
        </article>

        <aside className="card exam-palette">
          <h4>Question Palette</h4>
          <div className="palette-grid">
            {(test.questions || []).map((question, index) => (
              <button
                key={question.id}
                type="button"
                className={`palette-btn ${statusForQuestion(question)}`}
                onClick={() => jumpToQuestion(index)}
              >
                {index + 1}
              </button>
            ))}
          </div>

          <div className="legend">
            <span><i className="dot answered" /> Answered</span>
            <span><i className="dot current" /> Current</span>
            <span><i className="dot unanswered" /> Unanswered</span>
          </div>
        </aside>
      </section>
    </main>
  );
}
