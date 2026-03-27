import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../api';
import { formatSeconds } from '../../utils/format';

const SUBMIT_EVENT_KEY = 'test-portal-submitted-at';
const OFFLINE_SAVE_KEY = (testId) => `exam-offline-${testId}`;
const AUTO_SAVE_INTERVAL_MS = 30_000;
const LOW_TIME_WARN_SECS = 600; // 10 minutes

// ── Calculator helpers ───────────────────────────────────────────────────────
// Safe expression evaluator using recursive descent parsing (no eval/Function)

function parseNum(tokens, pos) {
  if (pos[0] >= tokens.length) return [0, pos[0]];
  const tok = tokens[pos[0]];
  if (tok === '(') {
    pos[0]++;
    const [val, nextPos] = parseExpr(tokens, pos);
    pos[0] = nextPos;
    if (tokens[pos[0]] === ')') pos[0]++;
    return [val, pos[0]];
  }
  const num = parseFloat(tok);
  pos[0]++;
  return [Number.isNaN(num) ? 0 : num, pos[0]];
}

function parseMul(tokens, pos) {
  let [left] = parseNum(tokens, pos);
  while (pos[0] < tokens.length && (tokens[pos[0]] === '*' || tokens[pos[0]] === '/')) {
    const op = tokens[pos[0]++];
    const [right] = parseNum(tokens, pos);
    left = op === '*' ? left * right : right !== 0 ? left / right : NaN;
  }
  return [left, pos[0]];
}

function parseExpr(tokens, pos) {
  let [left] = parseMul(tokens, pos);
  while (pos[0] < tokens.length && (tokens[pos[0]] === '+' || tokens[pos[0]] === '-')) {
    const op = tokens[pos[0]++];
    const [right] = parseMul(tokens, pos);
    left = op === '+' ? left + right : left - right;
  }
  return [left, pos[0]];
}

function tokenize(expr) {
  const result = [];
  let i = 0;
  while (i < expr.length) {
    if (/\s/.test(expr[i])) { i++; continue; }
    if (/[0-9.]/.test(expr[i])) {
      let num = '';
      while (i < expr.length && /[0-9.]/.test(expr[i])) num += expr[i++];
      result.push(num);
    } else {
      result.push(expr[i++]);
    }
  }
  return result;
}

function safeEval(expr) {
  try {
    const cleaned = expr.replace(/×/g, '*').replace(/÷/g, '/');
    const tokens = tokenize(cleaned);
    if (!tokens.length) return '';
    const pos = [0];
    const [result] = parseExpr(tokens, pos);
    if (!Number.isFinite(result)) return 'Error';
    return String(parseFloat(result.toFixed(10)));
  } catch {
    return 'Error';
  }
}

function Calculator({ onClose }) {
  const [display, setDisplay] = useState('0');
  const [expr, setExpr] = useState('');
  const [justEvaled, setJustEvaled] = useState(false);

  function press(val) {
    if (val === 'C') {
      setDisplay('0');
      setExpr('');
      setJustEvaled(false);
      return;
    }
    if (val === '=') {
      const result = safeEval(expr + display);
      setExpr('');
      setDisplay(result === 'Error' ? 'Error' : result);
      setJustEvaled(true);
      return;
    }
    if (['+', '-', '×', '÷'].includes(val)) {
      const newExpr = expr + (justEvaled ? display : display) + val;
      setExpr(newExpr);
      setDisplay('0');
      setJustEvaled(false);
      return;
    }
    if (val === '⌫') {
      setDisplay((d) => (d.length > 1 ? d.slice(0, -1) : '0'));
      return;
    }
    if (val === '.') {
      if (display.includes('.')) return;
      setDisplay((d) => (justEvaled ? '0.' : d + '.'));
      setJustEvaled(false);
      return;
    }
    // digit
    const next = justEvaled || display === '0' ? val : display + val;
    setDisplay(next);
    setJustEvaled(false);
  }

  const rows = [
    ['C', '⌫', '÷', '×'],
    ['7', '8', '9', '-'],
    ['4', '5', '6', '+'],
    ['1', '2', '3', '='],
    ['0', '.'],
  ];

  return (
    <div className="fixed bottom-6 right-6 w-[220px] bg-white border border-[var(--line)] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.18)] z-[8888] overflow-hidden">
      <div className="bg-[#1e293b] text-white flex justify-between items-center px-[0.7rem] py-[0.45rem] font-bold text-[0.88rem]">
        <span>Calculator</span>
        <button type="button" className="bg-transparent border-none text-white p-0 cursor-pointer text-base leading-none" onClick={onClose}>✕</button>
      </div>
      <div className="bg-[#0f172a] text-[#64748b] text-xs px-[0.7rem] pt-[0.2rem] text-right min-h-[1.3rem] font-mono">{expr || '\u00a0'}</div>
      <div className="bg-[#0f172a] text-[#f8fafc] text-2xl font-bold text-right px-[0.7rem] pb-[0.4rem] pt-[0.15rem] font-mono break-all">{display}</div>
      <div className="p-[0.4rem] grid gap-[0.3rem]">
        {rows.map((row, ri) => (
          <div key={ri} className="flex gap-[0.3rem]">{/* rows are static, index key is safe */}
            {row.map((k) => (
              <button
                key={k}
                type="button"
                className={`flex-1 border border-[var(--line)] rounded-lg py-2 text-[0.9rem] font-semibold cursor-pointer${
                  k === '=' ? ' bg-[#008870] text-white border-[#008870]' : ''
                }${k === 'C' ? ' bg-[#fee2e2] text-[#7f1d1d] border-[#fca5a5]' : ''}${
                  k !== '=' && k !== 'C' ? ' bg-[var(--card-soft)] text-[var(--ink)]' : ''
                }`}
                onClick={() => press(k)}
              >
                {k}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Confirm submit dialog ────────────────────────────────────────────────────

function SubmitDialog({ counts, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-[9999]">
      <div className="bg-white border border-[var(--line)] rounded-2xl p-5 w-[min(440px,92vw)] shadow-[0_24px_60px_rgba(0,0,0,0.2)]">
        <h3>Submit Test?</h3>
        <p className="text-[var(--muted)] m-0">Once submitted, you cannot change your answers.</p>
        <div className="grid grid-cols-2 gap-2.5 mt-3.5">
          <div className="submit-count-item answered rounded-xl p-2.5 text-center flex flex-col gap-1">
            <strong>{counts.answered}</strong>
            <span>Answered</span>
          </div>
          <div className="submit-count-item not-answered rounded-xl p-2.5 text-center flex flex-col gap-1">
            <strong>{counts.notAnswered}</strong>
            <span>Not Answered</span>
          </div>
          <div className="submit-count-item marked rounded-xl p-2.5 text-center flex flex-col gap-1">
            <strong>{counts.markedForReview}</strong>
            <span>Marked for Review</span>
          </div>
          <div className="submit-count-item not-visited rounded-xl p-2.5 text-center flex flex-col gap-1">
            <strong>{counts.notVisited}</strong>
            <span>Not Visited</span>
          </div>
        </div>
        <div className="flex gap-2" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
          <button type="button" onClick={onConfirm}>Submit</button>
        </div>
      </div>
    </div>
  );
}

// ── Main ExamPage ────────────────────────────────────────────────────────────

export default function ExamPage({ token, testId, setMessage }) {
  const [test, setTest] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeSection, setActiveSection] = useState(null);

  // answers: { [qId]: { selectedOptionId, selectedOptionIds, numericAnswer } }
  const [answers, setAnswers] = useState({});
  // questionStates: { [qId]: { visited, markedForReview } }
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
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showOfflineAlert, setShowOfflineAlert] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const [showScratchpad, setShowScratchpad] = useState(false);
  const [scratchpad, setScratchpad] = useState('');
  const [showStartDialog, setShowStartDialog] = useState(true);

  const autoSaveTimer = useRef(null);
  // Refs to track latest state for submit (avoids stale closure issues)
  const answersRef = useRef({});
  const questionStatesRef = useRef({});
  const questionTimesRef = useRef({});

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

  // ── derived ──────────────────────────────────────────────────────────────

  const filteredQuestions = useMemo(() => {
    if (!test) return [];
    const qs = test.questions || [];
    if (!activeSection) return qs;
    return qs.filter((q) => q.section === activeSection);
  }, [test, activeSection]);

  const currentQuestion = useMemo(
    () => filteredQuestions[currentIndex] ?? null,
    [filteredQuestions, currentIndex],
  );

  const sections = useMemo(() => {
    if (!test?.sections?.length) return [];
    return test.sections;
  }, [test]);

  const isAnswered = useCallback((qId) => {
    const a = answers[qId];
    if (!a) return false;
    if (a.selectedOptionId) return true;
    if (a.selectedOptionIds?.length) return true;
    if (a.numericAnswer !== undefined && a.numericAnswer !== '' && a.numericAnswer !== null)
      return true;
    return false;
  }, [answers]);

  const paletteStatus = useCallback((q) => {
    const answered = isAnswered(q.id);
    const { visited = false, markedForReview = false } = questionStates[q.id] || {};
    if (answered && markedForReview) return 'answered-marked';
    if (answered) return 'answered';
    if (markedForReview) return 'marked';
    if (visited) return 'visited';
    return 'not-visited';
  }, [isAnswered, questionStates]);

  const counts = useMemo(() => {
    const questions = test?.questions || [];
    let answered = 0;
    let notAnswered = 0;
    let markedForReview = 0;
    let notVisited = 0;
    for (const q of questions) {
      const st = paletteStatus(q);
      if (st === 'answered' || st === 'answered-marked') answered += 1;
      else if (st === 'marked') markedForReview += 1;
      else if (st === 'visited') notAnswered += 1;
      else notVisited += 1;
    }
    return { answered, notAnswered, markedForReview, notVisited };
  }, [test, paletteStatus]);

  // ── offline sync ─────────────────────────────────────────────────────────

  function loadFromLocalStorage() {
    try {
      const raw = localStorage.getItem(OFFLINE_SAVE_KEY(testId));
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function clearLocalStorage() {
    localStorage.removeItem(OFFLINE_SAVE_KEY(testId));
  }

  // ── build payload ─────────────────────────────────────────────────────────

  function buildAnswersList(answersMap, statesMap) {
    if (!test) return [];
    return (test.questions || []).map((q) => {
      const a = answersMap[q.id] || {};
      const s = statesMap[q.id] || {};
      return {
        questionId: q.id,
        selectedOptionId: a.selectedOptionId || null,
        selectedOptionIds: a.selectedOptionIds || [],
        numericAnswer:
          a.numericAnswer !== undefined && a.numericAnswer !== '' ? Number(a.numericAnswer) : null,
        visited: Boolean(s.visited),
        markedForReview: Boolean(s.markedForReview),
      };
    });
  }

  // ── auto-save ─────────────────────────────────────────────────────────────

  const doAutoSave = useCallback(
    async (currentAnswers, currentStates, currentTimes) => {
      // Update refs for latest snapshot
      answersRef.current = currentAnswers;
      questionStatesRef.current = currentStates;
      questionTimesRef.current = currentTimes;

      // Persist locally
      try {
        localStorage.setItem(
          OFFLINE_SAVE_KEY(testId),
          JSON.stringify({ answers: currentAnswers, questionStates: currentStates, questionTimes: currentTimes, endAt }),
        );
      } catch { /* ignore quota errors */ }

      if (!navigator.onLine || !test) return;
      try {
        await api.saveTestSession(token, test._id, {
          answers: buildAnswersList(currentAnswers, currentStates),
          questionTimes: currentTimes,
          activeQuestionId: currentQuestion?.id || null,
          activeSection,
          antiCheat,
        });
      } catch {
        // best-effort
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [token, test, testId, endAt, currentQuestion, activeSection, antiCheat],
  );

  // ── load / init ───────────────────────────────────────────────────────────

  function handleStartConfirm() {
    setShowStartDialog(false);
    loadTest();
  }

  async function loadTest() {
    try {
      // Start or resume session
      await api.startTestSession(token, testId);
      const [testResp, sessionResp] = await Promise.all([
        api.getTestById(token, testId),
        api.getTestSession(token, testId),
      ]);

      const testData = testResp.test;
      setTest(testData);

      // Determine end time from session startedAt + duration
      const session = sessionResp.attempt;
      const durationSec = Number(testData.durationMinutes || 0) * 60;
      let resolvedEndAt;

      if (session?.startedAt) {
        resolvedEndAt = new Date(session.startedAt).getTime() + durationSec * 1000;
      } else {
        resolvedEndAt = Date.now() + durationSec * 1000;
      }

      setStartAt(session?.startedAt ? new Date(session.startedAt).getTime() : Date.now());
      setEndAt(resolvedEndAt);

      const leftSec = Math.max(0, Math.floor((resolvedEndAt - Date.now()) / 1000));
      setLeftTime(formatSeconds(leftSec));

      // Restore saved answers
      let restoredAnswers = {};
      let restoredStates = {};
      let restoredTimes = {};

      if (session?.answers?.length) {
        for (const a of session.answers) {
          restoredAnswers[a.questionId] = {
            selectedOptionId: a.selectedOptionId || null,
            selectedOptionIds: a.selectedOptionIds || [],
            numericAnswer: a.numericAnswer !== null ? String(a.numericAnswer) : '',
          };
          restoredStates[a.questionId] = {
            visited: Boolean(a.visited),
            markedForReview: Boolean(a.markedForReview),
          };
        }
        if (session.questionTimes) {
          restoredTimes = Object.fromEntries(
            Object.entries(session.questionTimes).map(([k, v]) => [k, Number(v)]),
          );
        }
      } else {
        // fallback to localStorage
        const local = loadFromLocalStorage();
        if (local) {
          restoredAnswers = local.answers || {};
          restoredStates = local.questionStates || {};
          restoredTimes = local.questionTimes || {};
        }
      }

      setAnswers(restoredAnswers);
      setQuestionStates(restoredStates);
      setQuestionTimes(restoredTimes);
      // Sync refs with restored state
      answersRef.current = restoredAnswers;
      questionStatesRef.current = restoredStates;
      questionTimesRef.current = restoredTimes;

      // Navigate to active question if resumed
      if (session?.activeQuestionId) {
        const idx = (testData.questions || []).findIndex(
          (q) => q.id === session.activeQuestionId,
        );
        if (idx >= 0) setCurrentIndex(idx);
      }

      // Set active section
      if (testData.sections?.length) {
        setActiveSection(session?.activeSection || testData.sections[0]?.key || null);
      }

      await enterFullscreen();
    } catch (error) {
      setMessage(error.message);
    }
  }

  // ── timer ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!test || !endAt || submitted) return;

    const timer = setInterval(() => {
      setQuestionTimes((prev) => {
        const q = currentQuestion?.id;
        if (!q) return prev;
        const next = { ...prev, [q]: (prev[q] || 0) + 1 };
        questionTimesRef.current = next;
        return next;
      });

      const leftSec = Math.max(0, Math.floor((endAt - Date.now()) / 1000));
      setLeftTime(formatSeconds(leftSec));

      if (leftSec <= LOW_TIME_WARN_SECS && !lowTimeWarning) {
        setLowTimeWarning(true);
      }

      if (leftSec <= 0) {
        clearInterval(timer);
        submitNow(true);
      }
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [test, endAt, submitted, currentQuestion?.id]);

  // ── auto-save interval ────────────────────────────────────────────────────

  useEffect(() => {
    if (!test || submitted) return;
    autoSaveTimer.current = setInterval(() => {
      // Use refs for latest state snapshot (avoids stale closure)
      doAutoSave(answersRef.current, questionStatesRef.current, questionTimesRef.current);
    }, AUTO_SAVE_INTERVAL_MS);
    return () => clearInterval(autoSaveTimer.current);
  }, [test, submitted, doAutoSave]);

  // ── violation auto-submit ─────────────────────────────────────────────────

  useEffect(() => {
    if (submitted) return;
    if (violationScore >= 8) {
      submitNow(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [violationScore, submitted]);

  // ── anti-cheat listeners ──────────────────────────────────────────────────

  useEffect(() => {
    if (submitted) return;

    function blockContext(e) {
      e.preventDefault();
      setAntiCheat((p) => ({ ...p, contextMenuCount: p.contextMenuCount + 1 }));
    }
    function blockClipboard(e) {
      e.preventDefault();
      setAntiCheat((p) => ({ ...p, copyPasteCount: p.copyPasteCount + 1 }));
    }
    function onVisibilityChange() {
      if (document.hidden)
        setAntiCheat((p) => ({ ...p, visibilityHiddenCount: p.visibilityHiddenCount + 1 }));
    }
    function onBlur() {
      setAntiCheat((p) => ({ ...p, blurCount: p.blurCount + 1 }));
    }
    function onFullScreenChange() {
      if (!document.fullscreenElement && test)
        setAntiCheat((p) => ({ ...p, fullScreenExitCount: p.fullScreenExitCount + 1 }));
    }
    function onKeyDown(e) {
      const key = e.key.toLowerCase();
      const blocked =
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'u', 'p', 's'].includes(key)) ||
        (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(key));
      if (blocked) {
        e.preventDefault();
        setAntiCheat((p) => ({ ...p, blockedShortcutCount: p.blockedShortcutCount + 1 }));
      }
    }
    function onBeforeUnload(e) {
      e.preventDefault();
      e.returnValue = '';
    }
    function onOnline() { setIsOffline(false); }
    function onOffline() { setIsOffline(true); }

    document.addEventListener('contextmenu', blockContext);
    document.addEventListener('copy', blockClipboard);
    document.addEventListener('cut', blockClipboard);
    document.addEventListener('paste', blockClipboard);
    document.addEventListener('visibilitychange', onVisibilityChange);
    document.addEventListener('fullscreenchange', onFullScreenChange);
    window.addEventListener('blur', onBlur);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

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
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [submitted, test]);

  // ── question navigation ───────────────────────────────────────────────────

  function markVisited(qId) {
    setQuestionStates((prev) => {
      const next = { ...prev, [qId]: { ...(prev[qId] || {}), visited: true } };
      questionStatesRef.current = next;
      return next;
    });
  }

  function jumpToQuestion(index) {
    if (currentQuestion) markVisited(currentQuestion.id);
    setCurrentIndex(index);
    if (filteredQuestions[index]) markVisited(filteredQuestions[index].id);
  }

  function goNext() {
    jumpToQuestion(Math.min(filteredQuestions.length - 1, currentIndex + 1));
  }
  function goPrev() {
    jumpToQuestion(Math.max(0, currentIndex - 1));
  }

  // ── answer handling ───────────────────────────────────────────────────────

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
      const cur = prev[currentQuestion.id] || {};
      const ids = cur.selectedOptionIds || [];
      const next = ids.includes(optionId)
        ? ids.filter((id) => id !== optionId)
        : [...ids, optionId];
      const updated = { ...prev, [currentQuestion.id]: { ...cur, selectedOptionIds: next } };
      answersRef.current = updated;
      return updated;
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

  function toggleMarkForReview() {
    if (!currentQuestion) return;
    setQuestionStates((prev) => {
      const next = {
        ...prev,
        [currentQuestion.id]: {
          ...(prev[currentQuestion.id] || {}),
          visited: true,
          markedForReview: !prev[currentQuestion.id]?.markedForReview,
        },
      };
      questionStatesRef.current = next;
      return next;
    });
  }

  // ── fullscreen ────────────────────────────────────────────────────────────

  async function enterFullscreen() {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // ignore
    }
  }

  // ── submit ────────────────────────────────────────────────────────────────

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

    // Use refs for the latest state snapshot (avoids stale closure)
    const currentAnswers = answersRef.current;
    const currentStates = questionStatesRef.current;
    const currentTimes = questionTimesRef.current;

    // Final save to localStorage before submit
    try {
      localStorage.setItem(
        OFFLINE_SAVE_KEY(testId),
        JSON.stringify({ answers: currentAnswers, questionStates: currentStates, questionTimes: currentTimes, endAt }),
      );
    } catch { /* ignore */ }

    try {
      const durationSeconds = Math.max(0, Math.floor((Date.now() - (startAt || Date.now())) / 1000));
      const response = await api.submitTest(token, test._id, {
        answers: buildAnswersList(currentAnswers, currentStates),
        durationSeconds,
        antiCheat,
        autoSubmitted,
        questionTimes: currentTimes,
      });

      setSubmittedDurationSeconds(durationSeconds);
      setSubmitted(response);
      clearLocalStorage();
      localStorage.setItem(SUBMIT_EVENT_KEY, String(Date.now()));
      setMessage(autoSubmitted ? 'Auto submitted due to timer or violations.' : 'Test submitted.');
    } catch (error) {
      setMessage(error.message);
      if (!navigator.onLine) setShowOfflineAlert(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── render helpers ────────────────────────────────────────────────────────

  function renderAnswerInput() {
    if (!currentQuestion) return null;
    const qId = currentQuestion.id;
    const a = answers[qId] || {};

    if (currentQuestion.type === 'NAT') {
      return (
        <div className="my-2">
          <label className="font-semibold grid gap-[0.4rem]">
            Enter your answer:
            <input
              type="number"
              className="max-w-[240px] text-[1.05rem] px-3 py-2"
              value={a.numericAnswer ?? ''}
              onChange={(e) => saveNAT(e.target.value)}
              placeholder="Type numeric answer"
              step="any"
            />
          </label>
          {currentQuestion.numerical?.min !== null && (
            <p className="text-[var(--muted)] m-0 mt-1 text-sm">
              Range: [{currentQuestion.numerical.min}, {currentQuestion.numerical.max}]
            </p>
          )}
        </div>
      );
    }

    if (currentQuestion.type === 'MSQ') {
      return (
        <div className="grid gap-3">
          <p className="m-0 text-[var(--muted)] text-sm">Select all correct options:</p>
          {(currentQuestion.options || []).map((option) => (
            <label key={option.id} className="flex gap-2 font-medium items-start">
              <input
                type="checkbox"
                checked={(a.selectedOptionIds || []).includes(option.id)}
                onChange={() => toggleMSQ(option.id)}
              />
              <span>
                {option.id}. {option.text}
                {option.image && <img src={option.image} alt="" className="max-w-[140px] block mt-1 rounded-lg border border-[var(--line)]" />}
              </span>
            </label>
          ))}
        </div>
      );
    }

    // MCQ (default)
    return (
      <div className="grid gap-3">
        {(currentQuestion.options || []).map((option) => (
          <label key={option.id} className="flex gap-2 font-medium items-start">
            <input
              type="radio"
              checked={a.selectedOptionId === option.id}
              onChange={() => saveMCQ(option.id)}
            />
            <span>
              {option.id}. {option.text}
              {option.image && <img src={option.image} alt="" className="max-w-[140px] block mt-1 rounded-lg border border-[var(--line)]" />}
            </span>
          </label>
        ))}
      </div>
    );
  }

  // ── loading / submitted ───────────────────────────────────────────────────

  if (showStartDialog) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]">
        <div className="bg-white border border-[var(--line)] rounded-2xl p-8 w-[min(480px,92vw)] shadow-[0_24px_60px_rgba(0,0,0,0.25)] text-center">
          <div className="text-5xl mb-4">📝</div>
          <h2 className="mb-2">Ready to Start the Test?</h2>
          <p className="text-[var(--muted)] m-0 mb-6">
            The test will open in <strong>fullscreen mode</strong>. Do not switch tabs or
            navigate away during the test — violations are tracked and may lead to
            auto-submission.
          </p>
          <div className="flex gap-3 justify-center">
            <button type="button" className="secondary" onClick={() => window.close()}>
              Cancel
            </button>
            <button type="button" onClick={handleStartConfirm}>
              OK, Start Test
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!test) {
    return (
      <main className="w-[min(1500px,96vw)] mx-auto grid gap-3">
        <section className="bg-white border border-[var(--line)] rounded-2xl p-4 shadow-[0_16px_40px_rgba(21,29,43,0.08)]"><h2>Loading test...</h2></section>
      </main>
    );
  }

  if (submitted) {
    const durationMin = Math.floor(submittedDurationSeconds / 60);
    const durationSec = submittedDurationSeconds % 60;
    const percentage = submitted.totalMarks > 0
      ? ((submitted.score / submitted.totalMarks) * 100).toFixed(1)
      : 0;

    return (
      <main className="w-[min(1500px,96vw)] mx-auto grid gap-3">
        <section className="max-w-[640px] mx-auto mt-[6vh] bg-white border border-[var(--line)] rounded-[20px] p-8 shadow-[0_20px_60px_rgba(21,29,43,0.1)] text-center">
          <div className="mb-6">
            <div className="text-5xl mb-2">✅</div>
            <h2>Test Submitted Successfully!</h2>
            <p className="text-[var(--muted)] m-0">Your responses have been recorded. Here is your summary.</p>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-6">
            <div className="bg-[var(--card-soft)] border border-[var(--line)] rounded-xl p-3 flex flex-col gap-1">
              <span className="text-[1.4rem] font-bold text-[var(--accent)]">{submitted.score}</span>
              <span className="text-xs text-[var(--muted)] font-semibold">Score</span>
            </div>
            <div className="bg-[var(--card-soft)] border border-[var(--line)] rounded-xl p-3 flex flex-col gap-1">
              <span className="text-[1.4rem] font-bold text-[var(--accent)]">{submitted.totalMarks}</span>
              <span className="text-xs text-[var(--muted)] font-semibold">Total Marks</span>
            </div>
            <div className="bg-[var(--card-soft)] border border-[var(--line)] rounded-xl p-3 flex flex-col gap-1">
              <span className="text-[1.4rem] font-bold text-[var(--accent)]">{percentage}%</span>
              <span className="text-xs text-[var(--muted)] font-semibold">Percentage</span>
            </div>
            <div className="bg-[var(--card-soft)] border border-[var(--line)] rounded-xl p-3 flex flex-col gap-1">
              <span className="text-[1.4rem] font-bold text-[var(--accent)]">{durationMin}m {durationSec}s</span>
              <span className="text-xs text-[var(--muted)] font-semibold">Time Taken</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2.5 mb-2">
            <div className="submit-count-item answered rounded-xl p-2.5 text-center flex flex-col gap-1">
              <strong>{counts.answered}</strong>
              <span>Answered</span>
            </div>
            <div className="submit-count-item not-answered rounded-xl p-2.5 text-center flex flex-col gap-1">
              <strong>{counts.notAnswered}</strong>
              <span>Visited</span>
            </div>
            <div className="submit-count-item marked rounded-xl p-2.5 text-center flex flex-col gap-1">
              <strong>{counts.markedForReview}</strong>
              <span>Marked</span>
            </div>
            <div className="submit-count-item not-visited rounded-xl p-2.5 text-center flex flex-col gap-1">
              <strong>{counts.notVisited}</strong>
              <span>Not Visited</span>
            </div>
          </div>

          <div className="flex gap-2" style={{ justifyContent: 'center', marginTop: '1.6rem', gap: '0.8rem' }}>
            <button type="button" onClick={() => (window.location.hash = '#/dashboard')}>
              📊 Open Dashboard
            </button>
            <button type="button" className="secondary" onClick={() => (window.location.hash = `#/report/score/${test?._id}`)}>
              📈 View Report
            </button>
            <button type="button" className="secondary" onClick={() => window.close()}>
              Close Tab
            </button>
          </div>
        </section>
      </main>
    );
  }

  const leftSec = endAt ? Math.max(0, Math.floor((endAt - Date.now()) / 1000)) : 0;
  const timerClass = leftSec <= LOW_TIME_WARN_SECS ? 'pill danger' : 'pill';

  return (
    <main className="w-[min(1500px,96vw)] mx-auto grid gap-3">
      {/* Offline banner */}
      {isOffline && (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-xl px-3.5 py-2.5 font-semibold text-sm">
          ⚠️ You are offline. Answers are being saved locally and will sync when reconnected.
        </div>
      )}

      {/* Low-time warning */}
      {lowTimeWarning && leftSec > 0 && (
        <div className="bg-orange-50 border border-orange-300 text-orange-900 rounded-xl px-3.5 py-2.5 font-semibold text-sm flex items-center">
          ⏰ Less than 10 minutes remaining! Please review and submit.
          <button type="button" className="secondary" style={{ marginLeft: '0.7rem', padding: '0.2rem 0.6rem' }} onClick={() => setLowTimeWarning(false)}>✕</button>
        </div>
      )}

      {/* Topbar */}
      <section className="bg-white border border-[var(--line)] rounded-2xl p-4 shadow-[0_16px_40px_rgba(21,29,43,0.08)] flex justify-between gap-3 items-start">
        <div>
          <h2>{test.title}</h2>
          <p className="text-[var(--muted)] m-0">
            {test.category && <span className="inline-flex items-center rounded-full border border-[var(--line)] px-1.5 py-0.5 text-xs bg-[var(--card-soft)] mr-1">{test.category}</span>}
            {test.difficultyLevel && <span className="inline-flex items-center rounded-full border border-[var(--line)] px-1.5 py-0.5 text-xs bg-[var(--card-soft)] mr-1">{test.difficultyLevel}</span>}
            &nbsp;{test.totalMarks} marks · {test.questions?.length || 0} questions
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {violationScore > 0 && <span className="pill danger">Violations: {violationScore}</span>}
          <span className={timerClass}>⏱ {leftTime}</span>
          <button type="button" className="secondary" onClick={() => setShowCalc((v) => !v)}>
            🖩 Calc
          </button>
          <button type="button" className="secondary" onClick={() => setShowScratchpad((v) => !v)}>
            ✏️ Notes
          </button>
          <button type="button" className="secondary" onClick={enterFullscreen}>
            ⛶ Fullscreen
          </button>
        </div>
      </section>

      {/* Section tabs */}
      {sections.length > 0 && (
        <div className="flex gap-[0.4rem] flex-wrap py-[0.2rem]">
          <button
            type="button"
            className={`section-tab bg-[var(--card)] text-[var(--ink)] border border-[var(--line)] rounded-lg py-[0.38rem] px-[0.8rem] font-semibold text-sm cursor-pointer${!activeSection ? ' active' : ''}`}
            onClick={() => { setActiveSection(null); setCurrentIndex(0); }}
          >
            All
          </button>
          {sections.map((sec) => (
            <button
              key={sec.key}
              type="button"
              className={`section-tab bg-[var(--card)] text-[var(--ink)] border border-[var(--line)] rounded-lg py-[0.38rem] px-[0.8rem] font-semibold text-sm cursor-pointer${activeSection === sec.key ? ' active' : ''}`}
              onClick={() => { setActiveSection(sec.key); setCurrentIndex(0); }}
            >
              {sec.title}
            </button>
          ))}
        </div>
      )}

      {/* Main grid */}
      <section className="grid grid-cols-[1fr_270px] gap-3">
        <article className="bg-white border border-[var(--line)] rounded-2xl p-4 shadow-[0_16px_40px_rgba(21,29,43,0.08)] min-h-[65vh]">
          {/* Question header */}
          <div className="flex justify-between items-start flex-wrap gap-2 mb-3">
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="pill">Q {currentIndex + 1} / {filteredQuestions.length}</span>
              {currentQuestion?.subject && <span className="inline-flex items-center rounded-full border border-[var(--line)] px-1.5 py-0.5 text-xs bg-[var(--card-soft)] mr-1">{currentQuestion.subject}</span>}
              {currentQuestion?.topic && <span className="inline-flex items-center rounded-full border border-[var(--line)] px-1.5 py-0.5 text-xs bg-[var(--card-soft)] mr-1">{currentQuestion.topic}</span>}
              {currentQuestion?.difficulty && <span className="inline-flex items-center rounded-full border border-[var(--line)] px-1.5 py-0.5 text-xs bg-[var(--card-soft)] mr-1">{currentQuestion.difficulty}</span>}
              {currentQuestion?.type && <span className="inline-flex items-center rounded-full border border-[var(--line)] px-1.5 py-0.5 text-xs bg-[var(--card-soft)] mr-1 type-pill">{currentQuestion.type}</span>}
            </div>
            <div className="flex gap-[0.35rem] items-center">
              <span className="pill">+{currentQuestion?.marks?.total ?? 1}</span>
              {(currentQuestion?.marks?.negative ?? 0) > 0 && (
                <span className="pill danger">−{currentQuestion.marks.negative}</span>
              )}
            </div>
          </div>

          {/* Question text */}
          <div className="mb-4">
            <p className="text-[1.05rem] leading-[1.65] m-0 mb-2 whitespace-pre-wrap">{currentQuestion?.question?.text}</p>
            {currentQuestion?.question?.image && (
              <img src={currentQuestion.question.image} alt="Question" className="max-w-full border border-[var(--line)] rounded-xl mt-2" />
            )}
          </div>

          {/* Answer input */}
          {renderAnswerInput()}

          {/* Action row */}
          <div className="flex justify-between items-center flex-wrap gap-2.5 mt-4 pt-3 border-t border-[var(--line)]">
            <div className="flex gap-2">
              <button type="button" className="secondary" onClick={goPrev} disabled={currentIndex === 0}>
                ← Previous
              </button>
              <button type="button" className="secondary" onClick={goNext} disabled={currentIndex === filteredQuestions.length - 1}>
                Next →
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className={`secondary${questionStates[currentQuestion?.id]?.markedForReview ? ' marked-active' : ''}`}
                onClick={toggleMarkForReview}
              >
                {questionStates[currentQuestion?.id]?.markedForReview ? '🏴 Marked' : '🚩 Mark for Review'}
              </button>
              <button type="button" className="secondary" onClick={clearResponse}>
                ✕ Clear
              </button>
              <button
                type="button"
                className="bg-red-600 border-red-600"
                onClick={handleSubmitClick}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting…' : 'Submit Test'}
              </button>
            </div>
          </div>
        </article>

        {/* Palette */}
        <aside className="bg-white border border-[var(--line)] rounded-2xl p-4 shadow-[0_16px_40px_rgba(21,29,43,0.08)] sticky top-2 h-fit">
          <h4>Question Palette</h4>

          {sections.length > 0 && (
            <div>
              {sections.map((sec) => {
                const secQs = (test.questions || []).filter((q) => q.section === sec.key);
                return (
                  <div key={sec.key} className="mb-3">
                    <p className="text-xs font-bold text-[var(--muted)] m-0 mb-1 uppercase tracking-[0.06em]">{sec.title}</p>
                    <div className="grid grid-cols-6 gap-1.5">
                      {secQs.map((q) => {
                        const globalIdx = (test.questions || []).findIndex((tq) => tq.id === q.id);
                        const inFiltered = filteredQuestions.findIndex((fq) => fq.id === q.id);
                        return (
                          <button
                            key={q.id}
                            type="button"
                            className={`palette-btn rounded-lg border border-[var(--line)] bg-white text-[var(--ink)] py-1.5 px-0 ${paletteStatus(q)}${q.id === currentQuestion?.id ? ' current' : ''}`}
                            onClick={() => {
                              if (activeSection && activeSection !== q.section) {
                                setActiveSection(q.section);
                              }
                              const idx = inFiltered >= 0 ? inFiltered : globalIdx;
                              jumpToQuestion(idx >= 0 ? idx : 0);
                            }}
                          >
                            {globalIdx + 1}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {sections.length === 0 && (
            <div className="grid grid-cols-6 gap-1.5">
              {filteredQuestions.map((q, index) => (
                <button
                  key={q.id}
                  type="button"
                  className={`palette-btn rounded-lg border border-[var(--line)] bg-white text-[var(--ink)] py-1.5 px-0 ${paletteStatus(q)}${q.id === currentQuestion?.id ? ' current' : ''}`}
                  onClick={() => jumpToQuestion(index)}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          )}

          <div className="mt-3 grid gap-1.5">
            <span><i className="dot answered w-2 h-2 rounded-full inline-block mr-1.5" /> Answered</span>
            <span><i className="dot answered-marked w-2 h-2 rounded-full inline-block mr-1.5" /> Ans + Review</span>
            <span><i className="dot marked w-2 h-2 rounded-full inline-block mr-1.5" /> Marked</span>
            <span><i className="dot visited w-2 h-2 rounded-full inline-block mr-1.5" /> Visited</span>
            <span><i className="dot not-visited w-2 h-2 rounded-full inline-block mr-1.5" /> Not Visited</span>
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-1 text-xs text-[var(--muted)]">
            <span>{counts.answered} answered</span>
            <span>{counts.notAnswered} visited</span>
            <span>{counts.markedForReview} review</span>
            <span>{counts.notVisited} not seen</span>
          </div>
        </aside>
      </section>

      {/* Floating calculator */}
      {showCalc && <Calculator onClose={() => setShowCalc(false)} />}

      {/* Floating scratchpad */}
      {showScratchpad && (
        <div className="fixed bottom-6 left-6 w-[300px] bg-white border border-[var(--line)] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.18)] z-[8888] overflow-hidden flex flex-col">
          <div className="bg-[#1e293b] text-white flex justify-between items-center px-[0.7rem] py-[0.45rem] font-bold text-[0.88rem]">
            <span>Rough Work</span>
            <button type="button" className="bg-transparent border-none text-white p-0 cursor-pointer text-base leading-none" onClick={() => setShowScratchpad(false)}>✕</button>
          </div>
          <textarea
            className="w-full h-[200px] resize-none border-none rounded-none p-[0.7rem] text-[0.9rem] bg-[var(--card)] text-[var(--ink)]"
            value={scratchpad}
            onChange={(e) => setScratchpad(e.target.value)}
            placeholder="Use this space for rough work. Not saved."
          />
        </div>
      )}

      {/* Submit confirmation */}
      {showConfirm && (
        <SubmitDialog
          counts={counts}
          onConfirm={() => submitNow(false)}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      {/* Offline submit alert */}
      {showOfflineAlert && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-[9999]">
          <div className="bg-white border border-[var(--line)] rounded-2xl p-5 w-[min(440px,92vw)] shadow-[0_24px_60px_rgba(0,0,0,0.2)]">
            <h3>⚠️ No Internet Connection</h3>
            <p>Your answers are saved locally. Please connect to the internet and try submitting again.</p>
            <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="secondary" onClick={() => setShowOfflineAlert(false)}>
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowOfflineAlert(false);
                  if (navigator.onLine) submitNow(false);
                  else setMessage('Still offline. Please reconnect.');
                }}
              >
                Retry Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
