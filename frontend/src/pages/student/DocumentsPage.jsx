import Card from '../../components/ui/Card';
import PageHeader from '../../components/ui/PageHeader';

export default function DocumentsPage() {
  return (
    <div className="grid gap-4">
      <PageHeader
        title="Documents"
        subtitle="Access your study notes and PDFs."
      />
      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="p-6 text-center">
          <div className="text-4xl mb-3">📓</div>
          <h3 className="m-0 mb-1">Notes</h3>
          <p className="text-sm text-[var(--muted)] m-0">
            Your saved notes and summaries will appear here.
          </p>
        </Card>
        <Card className="p-6 text-center">
          <div className="text-4xl mb-3">📑</div>
          <h3 className="m-0 mb-1">PDFs</h3>
          <p className="text-sm text-[var(--muted)] m-0">
            Uploaded study PDFs and reference materials will appear here.
          </p>
        </Card>
      </div>
    </div>
  );
}
