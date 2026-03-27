import Card from '../../components/ui/Card';
import PageHeader from '../../components/ui/PageHeader';

const ARTICLES = [
  {
    date: 'March 2026',
    title: 'GATE 2026 Notification Released',
    summary:
      'The official notification for GATE 2026 has been released. The exam will be conducted in February 2026 across multiple disciplines.',
    tag: 'Exam News',
  },
  {
    date: 'February 2026',
    title: 'New Syllabus Updates for Chemical Engineering',
    summary:
      'IIT has updated the syllabus for Chemical Engineering to include advanced topics in thermodynamics and reaction engineering.',
    tag: 'Syllabus',
  },
  {
    date: 'January 2026',
    title: 'Tips for Cracking GATE Computer Science',
    summary:
      'Expert panel shares top strategies for tackling Data Structures, Algorithms, and Operating Systems in the GATE exam.',
    tag: 'Strategy',
  },
];

export default function CurrentAffairsPage() {
  return (
    <div className="grid gap-4">
      <PageHeader
        title="Current Affairs"
        subtitle="Stay updated with the latest news and updates."
      />
      <div className="grid gap-4">
        {ARTICLES.map((article, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="m-0 text-[1rem]">{article.title}</h3>
              <span className="shrink-0 inline-flex items-center rounded-full border border-[var(--line)] px-2.5 py-1 text-[0.7rem] font-bold bg-[var(--card-soft)]">
                {article.tag}
              </span>
            </div>
            <p className="m-0 text-[0.88rem] text-[var(--muted)] mb-2">{article.summary}</p>
            <p className="m-0 text-xs text-[var(--muted)]">{article.date}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
