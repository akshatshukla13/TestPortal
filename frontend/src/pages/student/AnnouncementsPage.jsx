import Card from '../../components/ui/Card';
import PageHeader from '../../components/ui/PageHeader';

const ANNOUNCEMENTS = [
  {
    type: 'Info',
    color: '#dbeafe',
    borderColor: '#93c5fd',
    textColor: '#1e40af',
    title: 'Scheduled Maintenance',
    body: 'The portal will be under scheduled maintenance on Sunday, April 6 from 2:00 AM – 4:00 AM IST.',
    date: 'March 27, 2026',
  },
  {
    type: 'Alert',
    color: '#fef9c3',
    borderColor: '#fde047',
    textColor: '#713f12',
    title: 'Mock Test Series Starts April 1',
    body:
      'A new mock test series for GATE 2026 preparation begins on April 1st. Make sure to complete the registration.',
    date: 'March 25, 2026',
  },
  {
    type: 'Update',
    color: '#dcfce7',
    borderColor: '#4ade80',
    textColor: '#14532d',
    title: 'Score Cards Now Available',
    body:
      'Score cards for the March 2026 mock test are now available. Visit the Reports section to view your results.',
    date: 'March 20, 2026',
  },
];

export default function AnnouncementsPage() {
  return (
    <div className="grid gap-4">
      <PageHeader
        title="Announcements"
        subtitle="Important updates and alerts from the portal."
      />
      <div className="grid gap-3">
        {ANNOUNCEMENTS.map((ann, i) => (
          <div
            key={i}
            className="rounded-2xl border p-4"
            style={{ background: ann.color, borderColor: ann.borderColor }}
          >
            <div className="flex items-start justify-between gap-3 mb-1">
              <h3 className="m-0 text-[1rem]" style={{ color: ann.textColor }}>
                {ann.title}
              </h3>
              <span
                className="shrink-0 inline-flex items-center rounded-full border px-2.5 py-1 text-[0.7rem] font-bold"
                style={{ borderColor: ann.borderColor, color: ann.textColor }}
              >
                {ann.type}
              </span>
            </div>
            <p className="m-0 text-[0.9rem] mb-2" style={{ color: ann.textColor }}>
              {ann.body}
            </p>
            <p className="m-0 text-xs opacity-70" style={{ color: ann.textColor }}>
              {ann.date}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
