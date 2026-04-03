import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../api';
import { formatSeconds } from '../../utils/format';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const SUBMIT_EVENT_KEY = 'test-portal-submitted-at';
const OFFLINE_SAVE_KEY = (testId) => `exam-offline-${testId}`;
const AUTO_SAVE_INTERVAL_MS = 30_000;
const LOW_TIME_WARN_SECS = 600;

const WATERMARK_VALUE = '298536392097';

function toQuestionTimeMap(questionTimesLike) {
  if (!questionTimesLike) return {};
  if (questionTimesLike instanceof Map) {
    return Object.fromEntries(questionTimesLike.entries());
  }
  return Object.fromEntries(Object.entries(questionTimesLike).map(([key, value]) => [key, Number(value)]));
}

function parseMarkLabel(value, fallback = '-') {
  if (value === null || value === undefined || value === '') return fallback;
  const text = String(value).trim();
  const match = text.match(/-?\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?/);
  return match ? match[0].replace(/\.0+$/, '') : text;
}

function truncateText(text, maxLength = 24) {
  if (!text) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function getSectionTitle(section) {
  if (!section) return '';
  return section.title || section.name || section.label || section.key || '';
}

function getQuestionText(question) {
  return question?.question?.text || question?.text || '';
}

function getQuestionImage(question) {
  return question?.question?.image || question?.image || null;
}

function getQuestionMarks(question) {
  const marks = question?.marks || {};
  return {
    correct: parseMarkLabel(marks.totalMarks ?? marks.correctMarks ?? marks.total ?? marks.marks, '2'),
    negative: parseMarkLabel(marks.negativeMarks ?? marks.negative ?? marks.negativeMark, '2/3'),
  };
}

function buildAnswerPayload(test, answersMap, statesMap) {
  if (!test) return [];
  return (test.questions || []).map((question) => {
    const answer = answersMap[question.id] || {};
    const state = statesMap[question.id] || {};
    return {
      questionId: question.id,
      selectedOptionId: answer.selectedOptionId || null,
      selectedOptionIds: answer.selectedOptionIds || [],
      numericAnswer:
        answer.numericAnswer !== undefined && answer.numericAnswer !== null && answer.numericAnswer !== ''
          ? Number(answer.numericAnswer)
          : null,
      visited: Boolean(state.visited),
      markedForReview: Boolean(state.markedForReview),
    };
  });
}

function QuestionStatusDialog({ title, body, counts, confirmLabel, cancelLabel, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 px-4">
      <div className="w-[min(440px,92vw)] border border-[#cfd7df] bg-white p-5 shadow-[0_24px_60px_rgba(0,0,0,0.2)]">
        <h3 className="mb-2 text-[18px] font-semibold text-[#1f2a37]">{title}</h3>
        <p className="m-0 text-sm text-[#5b6877]">{body}</p>
        <div className="mt-4 grid grid-cols-2 gap-2.5 text-center text-[11px] font-semibold">
          <div className="submit-count-item answered rounded-[2px] p-2.5">
            <strong className="block text-[18px] leading-none">{counts.answered}</strong>
            <span>Answered</span>
          </div>
          <div className="submit-count-item not-answered rounded-[2px] p-2.5">
            <strong className="block text-[18px] leading-none">{counts.notAnswered}</strong>
            <span>Not Answered</span>
          </div>
          <div className="submit-count-item marked rounded-[2px] p-2.5">
            <strong className="block text-[18px] leading-none">{counts.markedForReview}</strong>
            <span>Marked for Review</span>
          </div>
          <div className="submit-count-item not-visited rounded-[2px] p-2.5">
            <strong className="block text-[18px] leading-none">{counts.notVisited}</strong>
            <span>Not Visited</span>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="secondary" onClick={onCancel}>{cancelLabel}</button>
          <button type="button" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export default function ExamPage({ token, testId, setMessage }) {
  const [test, setTest] = useState(null);
  const [candidate, setCandidate] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeSection, setActiveSection] = useState(null);
  const [answers, setAnswers] = useState({});
  const [questionStates, setQuestionStates] = useState({});
  const [questionTimes, setQuestionTimes] = useState({});
  const [startAt, setStartAt] = useState(null);
  const [endAt, setEndAt] = useState(null);
  const [leftTime, setLeftTime] = useState('00:00');
  const [lowTimeWarning, setLowTimeWarning] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [submittedDurationSeconds, setSubmittedDurationSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showOfflineAlert, setShowOfflineAlert] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const autoSaveTimer = useRef(null);
  const answersRef = useRef({});
  const questionStatesRef = useRef({});
  const questionTimesRef = useRef({});
  const activeQuestionIdRef = useRef(null);
  const activeSectionRef = useRef(null);
  const endAtRef = useRef(null);

  useEffect(() => {
    let alive = true;

    api.me(token)
      .then((response) => {
        if (alive) setCandidate(response.user || null);
      })
      .catch(() => {
        // ignore profile lookup failures
      });

    return () => {
      alive = false;
    };
  }, [token]);

  const sections = useMemo(() => test?.sections || [], [test]);
  const allQuestions = useMemo(() => test?.questions || [], [test]);

  const activeQuestions = useMemo(() => {
    if (!activeSection) return allQuestions;
    return allQuestions.filter((question) => question.section === activeSection);
  }, [allQuestions, activeSection]);

  const currentQuestion = useMemo(
    () => activeQuestions[currentIndex] || null,
    [activeQuestions, currentIndex],
  );

  const currentSectionTitle = useMemo(() => {
    if (activeSection) {
      return truncateText(getSectionTitle(sections.find((section) => section.key === activeSection)) || activeSection, 20);
    }
    return truncateText(getSectionTitle(sections[0]) || 'General Aptitude', 20);
  }, [activeSection, sections]);

  const isAnswered = useCallback((questionId) => {
    const answer = answers[questionId];
    if (!answer) return false;
    if (answer.selectedOptionId) return true;
    if (answer.selectedOptionIds?.length) return true;
    if (answer.numericAnswer !== undefined && answer.numericAnswer !== '' && answer.numericAnswer !== null) {
      return true;
    }
    return false;
  }, [answers]);

  const paletteStatus = useCallback((question) => {
    const answered = isAnswered(question.id);
    const { visited = false, markedForReview = false } = questionStates[question.id] || {};

    if (answered && markedForReview) return 'answered-marked';
    if (answered) return 'answered';
    if (markedForReview) return 'marked';
    if (visited) return 'not-answered';
    return 'not-visited';
  }, [isAnswered, questionStates]);

  const counts = useMemo(() => {
    let answered = 0;
    let notAnswered = 0;
    let markedForReview = 0;
    let notVisited = 0;

    for (const question of allQuestions) {
      const status = paletteStatus(question);
      if (status === 'answered' || status === 'answered-marked') answered += 1;
      else if (status === 'marked') markedForReview += 1;
      else if (status === 'not-answered') notAnswered += 1;
      else notVisited += 1;
    }

    return { answered, notAnswered, markedForReview, notVisited };
  }, [allQuestions, paletteStatus]);

  const answeredAndMarkedCount = useMemo(
    () => allQuestions.filter((question) => paletteStatus(question) === 'answered-marked').length,
    [allQuestions, paletteStatus],
  );

  const questionMarks = useMemo(() => getQuestionMarks(currentQuestion), [currentQuestion]);

  function getSnapshot() {
    return {
      answers: answersRef.current,
      questionStates: questionStatesRef.current,
      questionTimes: questionTimesRef.current,
      activeQuestionId: activeQuestionIdRef.current,
      activeSection: activeSectionRef.current,
      endAt: endAtRef.current,
    };
  }

  function persistOfflineSnapshot(payload) {
    try {
      localStorage.setItem(
        OFFLINE_SAVE_KEY(testId),
        JSON.stringify({ ...payload, savedAt: Date.now() }),
      );
    } catch {
      // ignore storage quota errors
    }
  }

  function loadOfflineSnapshot() {
    try {
      const raw = localStorage.getItem(OFFLINE_SAVE_KEY(testId));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function clearOfflineSnapshot() {
    localStorage.removeItem(OFFLINE_SAVE_KEY(testId));
  }

  const doAutoSave = useCallback(async (currentAnswers, currentStates, currentTimes) => {
    answersRef.current = currentAnswers;
    questionStatesRef.current = currentStates;
    questionTimesRef.current = currentTimes;

    const payload = {
      answers: currentAnswers,
      questionStates: currentStates,
      questionTimes: currentTimes,
      activeQuestionId: activeQuestionIdRef.current,
      activeSection: activeSectionRef.current,
      endAt: endAtRef.current,
    };

    persistOfflineSnapshot(payload);

    if (!navigator.onLine || !test) return;

    try {
      await api.saveTestSession(token, test._id, {
        answers: buildAnswerPayload(test, currentAnswers, currentStates),
        questionTimes: currentTimes,
        activeQuestionId: activeQuestionIdRef.current,
        activeSection: activeSectionRef.current,
      });
    } catch {
      // best effort
    }
  }, [test, token]);

  useEffect(() => {
    let alive = true;

    async function loadTest() {
      try {
        await api.startTestSession(token, testId);

        const [testResponse, sessionResponse] = await Promise.all([
          api.getTestById(token, testId),
          api.getTestSession(token, testId),
        ]);

        if (!alive) return;

        const testData = testResponse.test;
        setTest(testData);

        const session = sessionResponse.attempt;
        const durationSeconds = Number(testData.durationMinutes || 0) * 60;
        const resolvedEndAt = session?.startedAt
          ? new Date(session.startedAt).getTime() + durationSeconds * 1000
          : Date.now() + durationSeconds * 1000;

        setStartAt(session?.startedAt ? new Date(session.startedAt).getTime() : Date.now());
        setEndAt(resolvedEndAt);
        endAtRef.current = resolvedEndAt;

        const localSnapshot = loadOfflineSnapshot();
        const serverSavedAt = session?.lastSavedAt ? new Date(session.lastSavedAt).getTime() : 0;
        const localSavedAt = Number(localSnapshot?.savedAt || 0);
        const shouldUseServerSnapshot = Boolean(session?.answers?.length) && serverSavedAt >= localSavedAt;

        let restoredAnswers = {};
        let restoredStates = {};
        let restoredTimes = {};
        let restoredQuestionId = null;
        let restoredSection = null;

        if (shouldUseServerSnapshot) {
          for (const answer of session.answers || []) {
            restoredAnswers[answer.questionId] = {
              selectedOptionId: answer.selectedOptionId || null,
              selectedOptionIds: answer.selectedOptionIds || [],
              numericAnswer:
                answer.numericAnswer !== null && answer.numericAnswer !== undefined
                  ? String(answer.numericAnswer)
                  : '',
            };
            restoredStates[answer.questionId] = {
              visited: Boolean(answer.visited),
              markedForReview: Boolean(answer.markedForReview),
            };
          }
          restoredTimes = toQuestionTimeMap(session.questionTimes);
          restoredQuestionId = session.activeQuestionId || null;
          restoredSection = session.activeSection || null;
        } else if (localSnapshot) {
          restoredAnswers = localSnapshot.answers || {};
          restoredStates = localSnapshot.questionStates || {};
          restoredTimes = toQuestionTimeMap(localSnapshot.questionTimes);
          restoredQuestionId = localSnapshot.activeQuestionId || null;
          restoredSection = localSnapshot.activeSection || null;
        }

        setAnswers(restoredAnswers);
        setQuestionStates(restoredStates);
        setQuestionTimes(restoredTimes);
        answersRef.current = restoredAnswers;
        questionStatesRef.current = restoredStates;
        questionTimesRef.current = restoredTimes;

        if (restoredQuestionId) {
          const restoredIndex = (testData.questions || []).findIndex((question) => question.id === restoredQuestionId);
          if (restoredIndex >= 0) setCurrentIndex(restoredIndex);
        }

        if (testData.sections?.length) {
          setActiveSection(restoredSection || testData.sections[0]?.key || null);
        }

        const leftSeconds = Math.max(0, Math.floor((resolvedEndAt - Date.now()) / 1000));
        setLeftTime(formatSeconds(leftSeconds));
      } catch (error) {
        if (alive) setMessage(error.message);
      }
    }

    loadTest();

    return () => {
      alive = false;
    };
  }, [token, testId, setMessage]);

  useEffect(() => {
    activeQuestionIdRef.current = currentQuestion?.id || null;
    activeSectionRef.current = activeSection;
  }, [currentQuestion, activeSection]);

  useEffect(() => {
    if (!test || !endAt || submitted) return;

    const timer = setInterval(() => {
      setQuestionTimes((prev) => {
        const questionId = currentQuestion?.id;
        if (!questionId) return prev;

        const next = { ...prev, [questionId]: (prev[questionId] || 0) + 1 };
        questionTimesRef.current = next;
        return next;
      });

      const leftSeconds = Math.max(0, Math.floor((endAt - Date.now()) / 1000));
      setLeftTime(formatSeconds(leftSeconds));

      if (leftSeconds <= LOW_TIME_WARN_SECS) setLowTimeWarning(true);
      if (leftSeconds <= 0) {
        clearInterval(timer);
        submitNow(true);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [test, endAt, submitted, currentQuestion?.id]);

  useEffect(() => {
    if (!test || submitted) return;

    autoSaveTimer.current = setInterval(() => {
      doAutoSave(answersRef.current, questionStatesRef.current, questionTimesRef.current);
    }, AUTO_SAVE_INTERVAL_MS);

    return () => clearInterval(autoSaveTimer.current);
  }, [test, submitted, doAutoSave]);

  useEffect(() => {
    if (!test || submitted) return;

    persistOfflineSnapshot({
      answers,
      questionStates,
      questionTimes,
      activeQuestionId: currentQuestion?.id || null,
      activeSection,
      endAt,
    });
  }, [test, submitted, answers, questionStates, questionTimes, currentQuestion?.id, activeSection, endAt]);

  useEffect(() => {
    if (!test || submitted) return undefined;

    function onBeforeUnload(event) {
      const snapshot = getSnapshot();

      persistOfflineSnapshot(snapshot);

      if (navigator.onLine && test?._id) {
        fetch(`${API_BASE}/tests/${test._id}/session`, {
          method: 'PATCH',
          keepalive: true,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            answers: buildAnswerPayload(test, snapshot.answers, snapshot.questionStates),
            questionTimes: snapshot.questionTimes,
            activeQuestionId: snapshot.activeQuestionId,
            activeSection: snapshot.activeSection,
          }),
        }).catch(() => {
          // best effort
        });
      }

      event.preventDefault();
      event.returnValue = '';
    }

    function onOnline() {
      setIsOffline(false);
    }

    function onOffline() {
      setIsOffline(true);
    }

    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [test, submitted, token]);

  useEffect(() => {
    if (!activeQuestions.length) return;
    if (currentIndex >= activeQuestions.length) {
      setCurrentIndex(0);
    }
  }, [activeQuestions, currentIndex]);

  function markVisited(questionId) {
    setQuestionStates((prev) => {
      const next = { ...prev, [questionId]: { ...(prev[questionId] || {}), visited: true } };
      questionStatesRef.current = next;
      return next;
    });
  }

  function jumpToQuestion(index) {
    if (currentQuestion) markVisited(currentQuestion.id);
    setCurrentIndex(index);
    const nextQuestion = activeQuestions[index];
    if (nextQuestion) markVisited(nextQuestion.id);
  }

  function saveMCQ(optionId) {
    if (!currentQuestion) return;
    setAnswers((prev) => {
      const next = { ...prev, [currentQuestion.id]: { selectedOptionId: optionId, selectedOptionIds: [], numericAnswer: '' } };
      answersRef.current = next;
      return next;
    });
  }

  function toggleMSQ(optionId) {
    if (!currentQuestion) return;
    setAnswers((prev) => {
      const currentAnswer = prev[currentQuestion.id] || {};
      const existing = currentAnswer.selectedOptionIds || [];
      const selectedOptionIds = existing.includes(optionId)
        ? existing.filter((id) => id !== optionId)
        : [...existing, optionId];
      const next = { ...prev, [currentQuestion.id]: { ...currentAnswer, selectedOptionIds } };
      answersRef.current = next;
      return next;
    });
  }

  function saveNAT(value) {
    if (!currentQuestion) return;
    setAnswers((prev) => {
      const next = { ...prev, [currentQuestion.id]: { selectedOptionId: null, selectedOptionIds: [], numericAnswer: value } };
      answersRef.current = next;
      return next;
    });
  }

  function clearResponse() {
    if (!currentQuestion) return;
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[currentQuestion.id];
      answersRef.current = next;
      return next;
    });
  }

  function saveAndNext() {
    if (!currentQuestion) return;
    markVisited(currentQuestion.id);
    if (currentIndex < activeQuestions.length - 1) {
      jumpToQuestion(currentIndex + 1);
    }
  }

  function markForReviewAndNext() {
    if (!currentQuestion) return;
    setQuestionStates((prev) => {
      const next = {
        ...prev,
        [currentQuestion.id]: {
          ...(prev[currentQuestion.id] || {}),
          visited: true,
          markedForReview: true,
        },
      };
      questionStatesRef.current = next;
      return next;
    });

    if (currentIndex < activeQuestions.length - 1) {
      jumpToQuestion(currentIndex + 1);
    }
  }

  function handleSubmitClick() {
    if (!navigator.onLine) {
      setShowOfflineAlert(true);
      return;
    }
    setShowConfirm(true);
  }

  async function submitNow(autoSubmitted = false) {
    if (!test || isSubmitting || submitted) return;
    if (!navigator.onLine && !autoSubmitted) {
      setShowOfflineAlert(true);
      return;
    }

    setIsSubmitting(true);
    setShowConfirm(false);

    const snapshot = getSnapshot();
    persistOfflineSnapshot(snapshot);

    try {
      const durationSeconds = Math.max(0, Math.floor((Date.now() - (startAt || Date.now())) / 1000));
      const response = await api.submitTest(token, test._id, {
        answers: buildAnswerPayload(test, snapshot.answers, snapshot.questionStates),
        durationSeconds,
        autoSubmitted,
        questionTimes: snapshot.questionTimes,
      });

      setSubmittedDurationSeconds(durationSeconds);
      setSubmitted(response);
      clearOfflineSnapshot();
      localStorage.setItem(SUBMIT_EVENT_KEY, String(Date.now()));
      setMessage(autoSubmitted ? 'Auto submitted due to timer.' : 'Test submitted.');
    } catch (error) {
      setMessage(error.message);
      if (!navigator.onLine) setShowOfflineAlert(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!test) {
    return (
      <main className="flex h-screen items-center justify-center bg-white text-[#1f2a37]">
        <div className="border border-[#d4dae1] bg-white px-5 py-4 text-sm shadow-sm">
          Loading test...
        </div>
      </main>
    );
  }

  if (submitted) {
    const durationMinutes = Math.floor(submittedDurationSeconds / 60);
    const durationSeconds = submittedDurationSeconds % 60;
    const percentage = submitted.totalMarks > 0 ? ((submitted.score / submitted.totalMarks) * 100).toFixed(1) : '0.0';

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f6f8] px-4">
        <section className="w-[min(720px,96vw)] border border-[#d4dae1] bg-white p-6 shadow-[0_24px_60px_rgba(0,0,0,0.12)]">
          <h2 className="mb-2 text-[22px] font-bold text-[#1f2a37]">Test Submitted Successfully</h2>
          <p className="m-0 text-sm text-[#5b6877]">Your responses have been recorded.</p>

          <div className="mt-5 grid grid-cols-2 gap-3 text-center text-sm font-semibold sm:grid-cols-4">
            <div className="submit-count-item answered rounded-[2px] p-3">
              <strong className="block text-[22px]">{submitted.score}</strong>
              <span>Score</span>
            </div>
            <div className="submit-count-item not-visited rounded-[2px] p-3">
              <strong className="block text-[22px]">{submitted.totalMarks}</strong>
              <span>Total Marks</span>
            </div>
            <div className="submit-count-item marked rounded-[2px] p-3">
              <strong className="block text-[22px]">{percentage}%</strong>
              <span>Percentage</span>
            </div>
            <div className="submit-count-item not-answered rounded-[2px] p-3">
              <strong className="block text-[22px]">{durationMinutes}m {durationSeconds}s</strong>
              <span>Time Taken</span>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button type="button" className="secondary" onClick={() => (window.location.hash = '#/dashboard')}>
              Open Dashboard
            </button>
            <button type="button" className="secondary" onClick={() => (window.location.hash = `#/report/score/${test?._id}`)}>
              View Report
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="exam-mock-page flex h-screen flex-col overflow-hidden bg-white text-black" style={{ fontFamily: '"Public Sans", "Inter", sans-serif' }}>
      <header className="w-full shrink-0">
        <div className="flex h-8 items-center justify-between bg-[#336699] px-4 text-xs text-white">
          <span className="font-medium">cdn4.digialm.com//OnlineAssessment/quiz.html?585@@M464@@0@@0@@0@@0</span>
          <div className="flex items-center gap-4">
            <span className="material-symbols-outlined text-sm" aria-hidden="true">search</span>
            <span className="material-symbols-outlined text-sm" aria-hidden="true">more_vert</span>
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-gray-300 bg-white px-4 py-1 shadow-sm">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center bg-white">
              <div className="flex h-8 w-8 items-center justify-center border border-gray-200 bg-[#eef2f6] text-[8px] font-bold tracking-[0.2em] text-[#4b2c85]">
                GATE
              </div>
            </div>
            <div className="min-w-0 text-center">
              <h1 className="truncate text-sm font-bold uppercase tracking-tight text-[#4b2c85]">
                GRADUATE APTITUDE TEST IN ENGINEERING (GATE 2026)
              </h1>
              <p className="truncate text-[10px] font-bold uppercase text-[#008cba]">
                Organizing Institute : INDIAN INSTITUTE OF TECHNOLOGY GUWAHATI
              </p>
            </div>
            <div className="ml-auto flex h-10 w-10 items-center justify-center">
              <div className="flex h-8 w-8 items-center justify-center border border-gray-200 bg-[#eef2f6] text-[9px] font-bold text-[#336699]">
                IITG
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-4">
            <button type="button" className="flex items-center gap-1 rounded-[2px] bg-[#337ab7] px-2 py-1 text-[11px] font-semibold text-white">
              <span className="material-symbols-outlined text-xs" aria-hidden="true">info</span>
              Instructions
            </button>
            <button type="button" className="flex items-center gap-1 rounded-[2px] bg-[#5cb85c] px-2 py-1 text-[11px] font-semibold text-white">
              <span className="material-symbols-outlined text-xs" aria-hidden="true">list_alt</span>
              Question Paper
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#336699] px-4 py-1 text-[11px] font-bold text-white">
          <div className="flex items-center gap-2 bg-[#008cba] px-3 py-1">
            <span>{currentSectionTitle}</span>
            <span className="material-symbols-outlined text-xs" aria-hidden="true">info</span>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <section className="relative flex min-w-0 flex-1 flex-col border-r border-gray-300 bg-white">
          <div className="flex items-center justify-between border-b border-gray-300 bg-gray-100 p-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="text-[11px] font-bold text-gray-700">Sections</span>
              <div className="flex min-w-0 gap-1 overflow-x-auto pb-0.5">
                {sections.map((section, index) => {
                  const title = getSectionTitle(section);
                  const isActive = activeSection === section.key || (!activeSection && index === 0);

                  return (
                    <button
                      key={section.key || title || index}
                      type="button"
                      className={`flex shrink-0 items-center gap-1 rounded-[2px] px-3 py-1 text-[11px] font-bold ${isActive ? 'bg-[#008cba] text-white' : 'border border-gray-300 bg-white text-[#337ab7]'}`}
                      onClick={() => {
                        setActiveSection(section.key || null);
                        setCurrentIndex(0);
                      }}
                    >
                      {truncateText(title, 18)}
                      <span className="material-symbols-outlined text-[10px]" aria-hidden="true">info</span>
                    </button>
                  );
                })}
                {!sections.length && (
                  <button type="button" className="flex items-center gap-1 rounded-[2px] bg-[#008cba] px-3 py-1 text-[11px] font-bold text-white">
                    General Aptitude
                    <span className="material-symbols-outlined text-[10px]" aria-hidden="true">info</span>
                  </button>
                )}
              </div>
            </div>

            <div className="text-[13px] font-bold text-black">
              Time Left : <span className={lowTimeWarning ? 'text-[#d9534f]' : 'text-black'}>{leftTime}</span>
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-gray-300 bg-white px-4 py-1 text-[11px]">
            <span className="font-bold">Question Type: {currentQuestion?.type || 'MCQ'}</span>
            <span className="text-gray-600">
              Marks for correct answer: <span className="font-bold text-green-600">{questionMarks.correct}</span> | Negative Marks: <span className="font-bold text-red-600">{questionMarks.negative}</span>
            </span>
          </div>

          {isOffline && (
            <div className="border-b border-[#f3c9a0] bg-[#fff6eb] px-4 py-1 text-[11px] font-semibold text-[#8a4f0e]">
              You are offline. Answers will be saved locally.
            </div>
          )}

          <div className="relative flex-1 overflow-y-auto p-6">
            <div className="watermark-container" aria-hidden="true">
              {Array.from({ length: 16 }).map((_, index) => (
                <div key={index} className="watermark-text">{WATERMARK_VALUE}</div>
              ))}
            </div>

            <div className="relative z-10">
              <h2 className="mb-4 text-sm font-bold">Question No. {currentIndex + 1}</h2>

              <div className="mb-8 text-[14px] leading-relaxed">
                {getQuestionText(currentQuestion)}
                {getQuestionImage(currentQuestion) && (
                  <img src={getQuestionImage(currentQuestion)} alt="Question" className="mt-4 max-w-full border border-gray-200" />
                )}
              </div>

              {currentQuestion?.type === 'NAT' ? (
                <div className="space-y-3 text-[13px]">
                  <label className="grid gap-2 font-semibold">
                    Enter your answer:
                    <input
                      type="number"
                      className="max-w-[240px] rounded-[2px] border border-gray-300 px-3 py-2 text-[1.05rem]"
                      value={answers[currentQuestion.id]?.numericAnswer ?? ''}
                      onChange={(event) => saveNAT(event.target.value)}
                      placeholder="Type numeric answer"
                      step="any"
                    />
                  </label>
                </div>
              ) : currentQuestion?.type === 'MSQ' ? (
                <div className="space-y-4 text-[13px]">
                  <p className="m-0 text-sm text-gray-600">Select all correct options:</p>
                  {(currentQuestion?.options || []).map((option) => {
                    const selected = (answers[currentQuestion.id]?.selectedOptionIds || []).includes(option.id);

                    return (
                      <label key={option.id} className="flex cursor-pointer items-start gap-3 group">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleMSQ(option.id)}
                          className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-0"
                        />
                        <span>
                          {option.id}. {option.text}
                          {option.image && (
                            <img src={option.image} alt="" className="mt-1 block max-w-[140px] border border-gray-200" />
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-6 text-[13px]">
                  {(currentQuestion?.options || []).map((option) => (
                    <label key={option.id} className="flex cursor-pointer items-center gap-3 group">
                      <input
                        type="radio"
                        name={`question-${currentQuestion?.id}`}
                        className="h-4 w-4 text-blue-600 focus:ring-0"
                        checked={answers[currentQuestion.id]?.selectedOptionId === option.id}
                        onChange={() => saveMCQ(option.id)}
                      />
                      <span>
                        {option.id}. {option.text}
                        {option.image && (
                          <img src={option.image} alt="" className="mt-1 block max-w-[140px] border border-gray-200" />
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-gray-300 bg-white px-3 py-3 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
            <div className="flex gap-2">
              <button type="button" className="rounded-[2px] border border-gray-300 bg-white px-4 py-1.5 text-[11px] font-medium text-black hover:bg-gray-50" onClick={markForReviewAndNext}>
                Mark for Review &amp; Next
              </button>
              <button type="button" className="rounded-[2px] border border-gray-300 bg-white px-4 py-1.5 text-[11px] font-medium text-black hover:bg-gray-50" onClick={clearResponse}>
                Clear Response
              </button>
            </div>

            <div className="flex gap-2">
              <button type="button" className="rounded-[2px] bg-[#337ab7] px-8 py-1.5 text-[11px] font-bold text-white" onClick={saveAndNext}>
                Save &amp; Next
              </button>
              <button type="button" className="rounded-[2px] bg-[#5bc0de] px-8 py-1.5 text-[11px] font-bold text-white" onClick={handleSubmitClick} disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </section>

        <aside className="flex w-[280px] flex-col bg-white">
          <div className="flex items-start gap-3 border-b border-gray-200 bg-gray-50 p-4">
            <div className="flex h-20 w-16 items-center justify-center overflow-hidden border border-gray-300 bg-gray-200 shadow-inner">
              {candidate?.image || candidate?.avatar ? (
                <img alt="Profile" className="h-full w-full object-cover grayscale" src={candidate.image || candidate.avatar} />
              ) : (
                <div className="flex h-full w-full items-end justify-center bg-gradient-to-b from-[#d9e0e8] to-[#b7c1cb] pb-2 text-[11px] font-semibold text-[#3d4a58]">
                  {candidate?.name?.slice(0, 2).toUpperCase() || 'JS'}
                </div>
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-800">{candidate?.name || 'John Smith'}</h3>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-2 gap-y-3 border-b border-gray-200 bg-white p-4 text-[10px] text-gray-700">
            <div className="flex items-center gap-2">
              <span className="answered-shape flex h-6 w-6 items-center justify-center font-bold text-white">{counts.answered}</span>
              <span>Answered</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="notanswered-shape flex h-6 w-6 items-center justify-center font-bold text-white shadow-sm">{counts.notAnswered}</span>
              <span>Not Answered</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="notvisited-shape flex h-6 w-6 items-center justify-center border border-gray-400 bg-white font-bold text-black">{counts.notVisited}</span>
              <span>Not Visited</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="marked-shape flex h-6 w-6 items-center justify-center rounded-full bg-[#9966cc] font-bold text-white">{counts.markedForReview}</span>
              <span>Marked for Review</span>
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <div className="relative">
                <span className="marked-shape flex h-6 w-6 items-center justify-center rounded-full bg-[#9966cc] text-[8px] font-bold text-white">{answeredAndMarkedCount}</span>
                <span className="absolute -bottom-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full border border-white bg-[#5cb85c]">
                  <span className="material-symbols-outlined text-[8px] text-white" aria-hidden="true">check</span>
                </span>
              </div>
              <span>Answered &amp; Marked for Review (will also be evaluated)</span>
            </div>
          </div>

          <div className="bg-[#337ab7] px-3 py-1.5 text-[11px] font-bold text-white">{getSectionTitle(sections.find((section) => section.key === activeSection)) || getSectionTitle(sections[0]) || 'General Aptitude'}</div>

          <div className="flex-1 overflow-y-auto p-4">
            <p className="mb-3 text-[11px] font-bold">Choose a Question</p>
            <div className="grid grid-cols-4 gap-2">
              {activeQuestions.map((question, index) => {
                const status = paletteStatus(question);
                const isCurrent = index === currentIndex;

                const className = [
                  'w-10 h-10 flex items-center justify-center text-[12px] font-bold border',
                  status === 'answered' ? 'answered-shape text-white border-transparent' : '',
                  status === 'not-answered' ? 'notanswered-shape text-white border-transparent' : '',
                  status === 'marked' ? 'marked-shape rounded-full bg-[#9966cc] text-white border-transparent' : '',
                  status === 'answered-marked' ? 'answered-marked-shape rounded-full text-white border-transparent' : '',
                  status === 'not-visited' ? 'notvisited-shape bg-white border-gray-300 text-black' : '',
                  isCurrent ? 'ring-2 ring-[#337ab7] ring-offset-1' : '',
                ].join(' ');

                return (
                  <button
                    key={question.id}
                    type="button"
                    className={className}
                    onClick={() => jumpToQuestion(index)}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      <footer className="flex h-7 w-full items-center justify-center bg-[#5a6a7a] text-[10px] text-white">
        <span>Version : 17.07.00</span>
      </footer>

      <div className="flex h-10 w-full items-center justify-between bg-[#2a2a2a] px-3">
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-white opacity-80" aria-hidden="true">grid_view</span>
          <span className="material-symbols-outlined text-white opacity-80" aria-hidden="true">search</span>
          <div className="ml-2 flex gap-4">
            <span className="material-symbols-outlined text-[#ffd700]" aria-hidden="true">folder</span>
            <span className="material-symbols-outlined text-[#4285f4]" aria-hidden="true">chrome_reader_mode</span>
            <span className="material-symbols-outlined text-[#217346]" aria-hidden="true">description</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-medium text-white">
          <span className="material-symbols-outlined text-xs" aria-hidden="true">keyboard_arrow_up</span>
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-xs" aria-hidden="true">wifi</span>
            <span className="material-symbols-outlined text-xs" aria-hidden="true">volume_up</span>
            <span className="material-symbols-outlined text-xs text-red-500" aria-hidden="true">error</span>
          </div>
          <div className="leading-none text-right">
            <div>8:23 PM</div>
            <div className="text-[9px]">4/3/2026</div>
          </div>
          <div className="ml-1 flex items-center border-l border-gray-600 pl-2">
            <span className="material-symbols-outlined text-xs" aria-hidden="true">chat_bubble</span>
            <span className="ml-0.5 rounded-full bg-gray-500 px-1 text-[8px]">2</span>
          </div>
        </div>
      </div>

      {lowTimeWarning && !showConfirm && !showOfflineAlert && (
        <div className="fixed left-1/2 top-4 z-[9998] -translate-x-1/2 border border-[#f3c9a0] bg-[#fff6eb] px-3 py-2 text-[11px] font-semibold text-[#8a4f0e] shadow-md">
          Less than 10 minutes remaining.
          <button type="button" className="ml-3 rounded-[2px] border border-[#d6b37d] bg-white px-2 py-0.5 text-[10px] font-bold text-[#8a4f0e]" onClick={() => setLowTimeWarning(false)}>
            Close
          </button>
        </div>
      )}

      {showConfirm && (
        <QuestionStatusDialog
          title="Submit Test?"
          body="Once submitted, you cannot change your answers."
          counts={counts}
          confirmLabel="Submit"
          cancelLabel="Cancel"
          onConfirm={() => submitNow(false)}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      {showOfflineAlert && (
        <QuestionStatusDialog
          title="No Internet Connection"
          body="Your answers are saved locally. Please connect to the internet and try submitting again."
          counts={counts}
          confirmLabel="Retry Submit"
          cancelLabel="Close"
          onConfirm={() => {
            setShowOfflineAlert(false);
            if (navigator.onLine) submitNow(false);
            else setMessage('Still offline. Please reconnect.');
          }}
          onCancel={() => setShowOfflineAlert(false)}
        />
      )}
    </main>
  );
}