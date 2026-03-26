import { useEffect, useState } from "react";
import { api } from "../../api";
import { openInNewTab, goTo } from "../../router";
import Card from "../../components/ui/Card";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";

const TABS = ["Active", "Upcoming", "Missed", "Completed"];

function getTestStatus(test) {
  const now = new Date();
  const start = new Date(test.startDate);
  const end = new Date(test.endDate);

  if (now < start) return "upcoming";
  if (now > end && !test.attemptStatus) return "missed";
  if (test.attemptStatus === "submitted") return "completed";
  return "active";
}

export default function TestDashboard({ token, setMessage }) {
  const [tests, setTests] = useState([]);
  const [activeTab, setActiveTab] = useState("Active");

  useEffect(() => {
    loadTests();
  }, [token]);

  async function loadTests() {
    try {
      const res = await api.getAvailableTests(token);
      const enriched = (res.tests || []).map((t) => ({
        ...t,
        status: getTestStatus(t),
      }));
      setTests(enriched);
    } catch (e) {
      console.error(e);
    }
  }

  function openTest(testId) {
    openInNewTab(`/test/${testId}`);
    setMessage?.("Test opened in new tab");
  }

  const filteredTests = tests.filter((t) => {
    if (activeTab === "Active") return t.status === "active";
    if (activeTab === "Upcoming") return t.status === "upcoming";
    if (activeTab === "Missed") return t.status === "missed";
    if (activeTab === "Completed") return t.status === "completed";
    return true;
  });

  return (
    <div className="grid gap-4">
      <PageHeader
        title="My Tests"
        subtitle="Track active, upcoming, missed, and completed assessments."
        right={
          <button type="button" className="secondary" onClick={() => goTo("/report")}>View Reports</button>
        }
      />

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

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredTests.map((test) => (
          <Card key={test._id} className="p-4">
            <div className="flex justify-between items-start gap-2.5 mb-3">
              <h3 className="m-0 text-[1.02rem]">{test.title}</h3>
              <StatusBadge className={`status-${test.status}`}>{test.status}</StatusBadge>
            </div>

            <div className="grid gap-2 text-sm text-[var(--muted)] bg-[var(--card-soft)] rounded-xl p-3">
              <div className="flex justify-between gap-2"><span>Start</span><span>{test.startDate}</span></div>
              <div className="flex justify-between gap-2"><span>End</span><span>{test.endDate}</span></div>
              <div className="flex justify-between gap-2"><span>Window</span><span>{test.timeWindow || "-"}</span></div>
              <div className="flex justify-between gap-2"><span>Duration</span><span>{test.durationMinutes} min</span></div>
            </div>

            <button
              type="button"
              onClick={() => openTest(test._id)}
              disabled={test.status === "completed"}
              className={`mt-4 w-full ${test.status === "missed" ? "warn-btn" : ""}`.trim()}
            >
              {test.status === "completed"
                ? "Completed"
                : test.status === "missed"
                ? "Expired"
                : test.attemptStatus === "in_progress"
                ? "Resume"
                : "Start"}
            </button>
          </Card>
        ))}
      </div>

      {filteredTests.length === 0 && <EmptyState message="No tests found in this tab." />}
    </div>
  );
}