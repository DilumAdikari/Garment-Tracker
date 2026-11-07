import { X } from 'lucide-react';

/** Two date inputs. value = { from, to } as yyyy-mm-dd strings. */
export default function DateRangeFilter({ value, onChange, label = 'Date range' }) {
  const set = (key) => (e) => onChange({ ...value, [key]: e.target.value });
  const hasValue = value.from || value.to;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="hidden text-xs font-medium uppercase tracking-wide text-slate-500 sm:inline">{label}</span>
      <input type="date" aria-label="From date" className="input w-auto py-1.5" value={value.from} onChange={set('from')} />
      <span className="text-slate-400">to</span>
      <input type="date" aria-label="To date" className="input w-auto py-1.5" value={value.to} onChange={set('to')} />
      {hasValue && (
        <button className="btn-ghost px-2 py-1.5" onClick={() => onChange({ from: '', to: '' })} aria-label="Clear dates">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
