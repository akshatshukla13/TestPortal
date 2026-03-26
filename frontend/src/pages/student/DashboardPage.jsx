import { useEffect, useState } from "react";
import { api } from "../../api";
import { openInNewTab, goTo } from "../../router";

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
    <div className="flex min-h-screen bg-gray-100">

      {/* Sidebar */}
      <aside className="w-64 bg-white border-r p-4 space-y-4">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 bg-purple-200 rounded flex items-center justify-center font-bold">
            e
          </div>
          <span className="font-semibold">Engenius</span>
        </div>

        <nav className="space-y-2 text-sm">
          <button className="w-full text-left px-3 py-2 rounded bg-blue-600 text-white">
            My Test
          </button>
          <button className="w-full text-left px-3 py-2 rounded hover:bg-gray-100">
            Product
          </button>
          <button
            onClick={() => goTo("/report")}
            className="w-full text-left px-3 py-2 rounded hover:bg-gray-100"
          >
            Report
          </button>
          <button className="w-full text-left px-3 py-2 rounded hover:bg-gray-100">
            Bookmarks
          </button>
          <button className="w-full text-left px-3 py-2 rounded hover:bg-gray-100">
            Documents
          </button>
          <button className="w-full text-left px-3 py-2 rounded hover:bg-gray-100">
            Video
          </button>
          <button className="w-full text-left px-3 py-2 rounded hover:bg-gray-100">
            Current Affairs
          </button>
          <button className="w-full text-left px-3 py-2 rounded hover:bg-gray-100">
            Announcements
          </button>
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1">

        {/* Header */}
        <div className="bg-blue-700 text-white px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold">My Test</h1>

          <div className="flex items-center gap-4">
            <input
              placeholder="Search Tests"
              className="px-3 py-1 rounded-md text-black outline-none"
            />
            <div className="w-8 h-8 bg-white text-black rounded-full flex items-center justify-center">
              U
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 px-6 py-3 bg-blue-600 text-white">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-1 flex items-center gap-1 ${
                activeTab === tab
                  ? "border-b-2 border-white font-semibold"
                  : "opacity-80"
              }`}
            >
              ● {tab}
            </button>
          ))}
        </div>

        {/* Cards */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredTests.map((test) => (
            <div
              key={test._id}
              className="bg-white rounded-xl border shadow-sm p-4 hover:shadow-md transition"
            >
              <h3 className="font-semibold text-lg mb-3">
                {test.title}
              </h3>

              <div className="bg-gray-100 rounded-lg p-3 text-sm text-gray-700 space-y-2">
                <div className="flex justify-between">
                  <span>Start</span>
                  <span>{test.startDate}</span>
                </div>
                <div className="flex justify-between">
                  <span>End</span>
                  <span>{test.endDate}</span>
                </div>
                <div className="flex justify-between">
                  <span>Time Window</span>
                  <span>{test.timeWindow || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Duration</span>
                  <span>{test.durationMinutes} min</span>
                </div>
              </div>

              <button
                onClick={() => openTest(test._id)}
                disabled={test.status === "completed"}
                className={`mt-4 w-full py-2 rounded-md text-white ${
                  test.status === "completed"
                    ? "bg-gray-400"
                    : test.status === "missed"
                    ? "bg-red-500"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {test.status === "completed"
                  ? "Completed"
                  : test.status === "missed"
                  ? "Expired"
                  : test.attemptStatus === "in_progress"
                  ? "Resume"
                  : "Start"}
              </button>
            </div>
          ))}

          {filteredTests.length === 0 && (
            <div className="col-span-full text-center text-gray-500 py-10">
              No tests found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}