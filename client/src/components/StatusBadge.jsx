const STYLES = {
  issued: 'bg-slate-100 text-slate-700 ring-slate-200',
  in_progress: 'bg-amber-50 text-amber-700 ring-amber-200',
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  closed: 'bg-slate-800 text-white ring-slate-800',
};

const LABELS = {
  issued: 'Issued',
  in_progress: 'In progress',
  completed: 'Completed',
  closed: 'Closed',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[status] || STYLES.issued}`}>
      {LABELS[status] || status}
    </span>
  );
}
