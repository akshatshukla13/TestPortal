import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../api";
import { openInPopup, goTo } from "../../router";
import Card from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import { formatDateTime } from "../../utils/format";

const TABS = ["Active", "Upcoming", "Missed", "Completed"];

function getTestStatus(test) {
  const now = new Date();
  const start = new Date(test.startTime);
  const end = new Date(test.endTime);

  if (now < start) return "upcoming";
  if (now > end && !test.attemptStatus) return "missed";
  if (test.attemptStatus === "submitted") return "completed";
  return "active";
}

function CompletedTestCard({ attempt }) {
  const testId = attempt.test?._id;
  return (
    <Card className="p-4">
      <div className="flex justify-between items-start gap-2.5 mb-3">
        <h3 className="m-0 text-[1.02rem]">{attempt.test?.title || "Test"}</h3>
        <span className="inline-flex items-center rounded-full border border-[var(--line)] px-2.5 py-1 text-[0.7rem] font-bold tracking-[0.04em] uppercase bg-[var(--card-soft)] text-[var(--muted)]">
          {formatDateTime(attempt.submittedAt)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm bg-[var(--card-soft)] rounded-xl p-3 mb-3">
        <div className="flex justify-between gap-2 col-span-2">
          <span className="text-[var(--muted)]">Maximum Marks</span>
          <strong>{attempt.test?.totalMarks ?? "—"}</strong>
        </div>
        <div className="flex justify-between gap-2 col-span-2">
          <span className="text-[var(--muted)]">Scored Marks</span>
          <strong className="text-[#2740c8]">{attempt.score ?? "—"}</strong>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-[var(--muted)]">✅ Correct</span>
          <strong className="text-[#14833b]">{attempt.correct ?? "—"}</strong>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-[var(--muted)]">❌ Incorrect</span>
          <strong className="text-[#bf3131]">{attempt.incorrect ?? "—"}</strong>
        </div>
        <div className="flex justify-between gap-2 col-span-2">
          <span className="text-[var(--muted)]">— Unattempted</span>
          <strong>{attempt.unattempted ?? "—"}</strong>
        </div>
      </div>

      <button
        type="button"
        className="w-full"
        onClick={() => goTo(`/report/score/${testId}`)}
      >
        View Report
      </button>
    </Card>
  );
}

export default function TestDashboard({ token, setMessage }) {
  const [tests, setTests] = useState([]);
  const [completedAttempts, setCompletedAttempts] = useState([]);
  const [activeTab, setActiveTab] = useState("Active");
  const [loadingTests, setLoadingTests] = useState(true);
  const [loadingAttempts, setLoadingAttempts] = useState(true);
  const [refreshingTests, setRefreshingTests] = useState(false);
  const lastRefreshAtRef = useRef(0);

  const loadTests = useCallback(async ({ background = false } = {}) => {
    if (background) {
      setRefreshingTests(true);
    } else {
      setLoadingTests(true);
    }

    try {
      const res = await api.getAvailableTests(token);
      const enriched = (res.tests || []).map((t) => ({
        ...t,
        status: getTestStatus(t),
      }));
      setTests(enriched);
    } catch (error) {
      setMessage?.(error.message || "Failed to load tests.");
    } finally {
      if (background) {
        setRefreshingTests(false);
      } else {
        setLoadingTests(false);
      }
    }
  }, [token, setMessage]);

  const loadAttempts = useCallback(async () => {
    setLoadingAttempts(true);
    try {
      const res = await api.getMyAttempts(token);
      setCompletedAttempts(res.attempts || []);
    } catch (error) {
      setMessage?.(error.message || "Failed to load attempts.");
    } finally {
      setLoadingAttempts(false);
    }
  }, [token, setMessage]);

  useEffect(() => {
    let alive = true;

    async function loadInitialData() {
      await Promise.all([loadTests(), loadAttempts()]);
    }

    loadInitialData();

    // Refresh status when user comes back from an exam tab.
    function handleFocusRefresh() {
      const now = Date.now();
      if (now - lastRefreshAtRef.current < 800) return;
      lastRefreshAtRef.current = now;
      if (alive) loadTests({ background: true });
    }

    function handleVisibilityRefresh() {
      if (!document.hidden) handleFocusRefresh();
    }

    window.addEventListener("focus", handleFocusRefresh);
    document.addEventListener("visibilitychange", handleVisibilityRefresh);

    return () => {
      alive = false;
      window.removeEventListener("focus", handleFocusRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityRefresh);
    };
  }, [loadAttempts, loadTests]);

  function openTest(testId) {
    const popup = openInPopup(`/test/${testId}`);
    if (!popup) {
      setMessage?.("Allow popups to start the test.");
      return;
    }
    setMessage?.("Test opened in a popup window.");
  }

  const filteredTests = tests.filter((t) => {
    if (activeTab === "Active") return t.status === "active";
    if (activeTab === "Upcoming") return t.status === "upcoming";
    if (activeTab === "Missed") return t.status === "missed";
    return false;
  });

  return (
    <div className="grid gap-4">
      {activeTab !== "Completed" && (loadingTests || refreshingTests) && (
        <p className="text-[var(--muted)] m-0">
          {loadingTests ? "Loading tests..." : "Refreshing tests..."}
        </p>
      )}

      {activeTab === "Completed" && loadingAttempts && (
        <p className="text-[var(--muted)] m-0">Loading completed tests...</p>
      )}

      <Card className="p-2.5">
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={activeTab === tab ? "section-tab active" : "section-tab"}
            >
              {tab}
            </button>
          ))}
        </div>
      </Card>

      {activeTab === "Completed" ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {completedAttempts.map((attempt) => (
              <CompletedTestCard key={attempt._id} attempt={attempt} />
            ))}
          </div>
          {completedAttempts.length === 0 && <EmptyState message="No completed tests yet." />}
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredTests.map((test) => (
              <Card key={test._id} className="p-4">
                <div className="flex justify-between items-start gap-2.5 mb-3">
                  <h3 className="m-0 text-[1.02rem]">{test.title}</h3>
                  <StatusBadge className={`status-${test.status}`}>{test.status}</StatusBadge>
                </div>

                <div className="grid gap-2 text-sm text-[var(--muted)] bg-[var(--card-soft)] rounded-xl p-3">
                  <div className="flex justify-between gap-2"><span>Start</span><span>{formatDateTime(test.startTime)}</span></div>
                  <div className="flex justify-between gap-2"><span>End</span><span>{formatDateTime(test.endTime)}</span></div>
                  <div className="flex justify-between gap-2"><span>Duration</span><span>{test.durationMinutes} min</span></div>
                </div>

                <button
                  type="button"
                  onClick={() => openTest(test._id)}
                  disabled={test.status === "missed"}
                  className={`mt-4 w-full ${test.status === "missed" ? "warn-btn" : ""}`.trim()}
                >
                  {test.status === "missed"
                    ? "Expired"
                    : test.attemptStatus === "in_progress"
                    ? "Resume"
                    : "Start"}
                </button>
              </Card>
            ))}
          </div>
          {filteredTests.length === 0 && <EmptyState message="No tests found in this tab." />}
        </>
      )}
    </div>
  );
}