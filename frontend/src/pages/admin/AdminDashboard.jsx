import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api';
import { formatDateTime } from '../../utils/format';

function getTestStatus(test) {
  const now = new Date();
  if (!test.isApproved) return 'inactive';
  if (new Date(test.startTime) > now) return 'upcoming';
  if (new Date(test.endTime) < now) return 'expired';
  return 'active';
}

const STATUS_STYLES = {
  active:   { background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' },
  inactive: { background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb' },
  upcoming: { background: '#dbeafe', color: '#1d4ed8', border: '1px solid #bfdbfe' },
  expired:  { background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' },
};

export default function AdminDashboard({ token, setMessage, onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getDashboardStats(token);
      setStats(data);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, setMessage]);

  useEffect(() => { loadStats(); }, [loadStats]);

  if (loading) return <p className="text-[var(--muted)]">Loading dashboard…</p>;

  const statCards = [
    { label: 'Total Tests', value: stats?.totalTests ?? 0 },
    { label: 'Active', value: stats?.activeTests ?? 0, color: '#166534' },
    { label: 'Inactive / Draft', value: stats?.inactiveTests ?? 0, color: '#6b7280' },
    { label: 'Upcoming', value: stats?.upcomingTests ?? 0, color: '#1d4ed8' },
    { label: 'Expired', value: stats?.expiredTests ?? 0, color: '#dc2626' },
    { label: 'Total Questions', value: stats?.totalQuestions ?? 0 },
    { label: 'Total Students', value: stats?.totalUsers ?? 0 },
  ];

  const recentTests = stats?.recentTests ?? [];

  return (
    <div className="grid gap-5">
      <h2 className="m-0">Dashboard</h2>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-white border border-[var(--line)] rounded-2xl p-4 shadow-[0_16px_40px_rgba(21,29,43,0.08)]"
          >
            <p className="text-[var(--muted)] text-xs m-0 mb-1">{card.label}</p>
            <p className="m-0 text-2xl font-bold" style={{ color: card.color || 'var(--ink)' }}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Recent Tests */}
      <div className="bg-white border border-[var(--line)] rounded-2xl p-4 shadow-[0_16px_40px_rgba(21,29,43,0.08)]">
        <h3 className="m-0 mb-3">Recent Tests</h3>
        {recentTests.length === 0 ? (
          <p className="text-[var(--muted)] m-0">No tests yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)', textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>Title</th>
                  <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>Questions</th>
                  <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>Start Time</th>
                  <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>End Time</th>
                </tr>
              </thead>
              <tbody>
                {recentTests.map((test) => {
                  const status = getTestStatus(test);
                  return (
                    <tr key={test.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '0.5rem 0.75rem', fontWeight: 500 }}>{test.title}</td>
                      <td style={{ padding: '0.5rem 0.75rem' }}>
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                          style={STATUS_STYLES[status]}
                        >
                          {status}
                        </span>
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem' }}>{test.questionCount ?? 0}</td>
                      <td style={{ padding: '0.5rem 0.75rem' }}>{formatDateTime(test.startTime)}</td>
                      <td style={{ padding: '0.5rem 0.75rem' }}>{formatDateTime(test.endTime)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex gap-3 flex-wrap">
        <button type="button" onClick={() => onNavigate('tests-new')}>＋ Create Test</button>
        <button type="button" className="secondary" onClick={() => onNavigate('bank')}>📚 Manage Question Bank</button>
      </div>
    </div>
  );
}
