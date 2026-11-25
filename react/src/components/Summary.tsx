import type { Summary as SummaryData } from '../lib/tasks';

const STATS: { key: keyof SummaryData; label: string }[] = [
  { key: 'total', label: 'Total' },
  { key: 'active', label: 'Active' },
  { key: 'done', label: 'Done' },
  { key: 'overdue', label: 'Overdue' },
];

/** FR-9: live counts of total / active / done / overdue tasks. */
export function Summary({ summary }: { summary: SummaryData }) {
  return (
    <section className="summary" aria-label="Summary">
      {STATS.map(({ key, label }) => (
        <div key={key} className={`stat stat-${key}`}>
          <span className="stat-value" data-testid={`count-${key}`}>
            {summary[key]}
          </span>
          <span className="stat-label">{label}</span>
        </div>
      ))}
    </section>
  );
}
