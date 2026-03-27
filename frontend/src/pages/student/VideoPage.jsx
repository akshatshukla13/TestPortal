import Card from '../../components/ui/Card';
import PageHeader from '../../components/ui/PageHeader';

const SAMPLE_TOPICS = [
  { title: 'Data Structures – Linked List', duration: '45 min', subject: 'Computer Engineering' },
  { title: 'Thermodynamics – First Law', duration: '38 min', subject: 'Chemical Engineering' },
  { title: 'Operating Systems – Process Management', duration: '52 min', subject: 'Computer Engineering' },
  { title: 'Heat Transfer – Conduction', duration: '41 min', subject: 'Chemical Engineering' },
  { title: 'Algorithms – Dynamic Programming', duration: '60 min', subject: 'Computer Engineering' },
];

export default function VideoPage() {
  return (
    <div className="grid gap-4">
      <PageHeader
        title="Video Lectures"
        subtitle="Topic-wise video content to strengthen your concepts."
      />
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {SAMPLE_TOPICS.map((topic, i) => (
          <Card key={i} className="p-4">
            <div className="aspect-video rounded-xl bg-[var(--card-soft)] flex items-center justify-center text-4xl mb-3">
              ▶️
            </div>
            <h3 className="m-0 mb-1 text-[0.98rem]">{topic.title}</h3>
            <div className="flex items-center gap-3 text-xs text-[var(--muted)] mt-2">
              <span>⏱ {topic.duration}</span>
              <span className="rounded-full bg-[var(--card-soft)] border border-[var(--line)] px-2 py-0.5">
                {topic.subject}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
