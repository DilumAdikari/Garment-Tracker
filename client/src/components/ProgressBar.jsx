export default function ProgressBar({ percent = 0, showLabel = true }) {
  const clamped = Math.min(Math.max(percent, 0), 100);
  const color =
    clamped >= 100 ? 'bg-emerald-500' : clamped >= 60 ? 'bg-brand-500' : clamped >= 25 ? 'bg-amber-500' : 'bg-red-400';

  return (
    <div className="flex items-center gap-3">
      <div className="h-2 w-full min-w-[80px] overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${clamped}%` }} />
      </div>
      {showLabel && <span className="w-12 text-right text-xs font-medium text-slate-600">{clamped}%</span>}
    </div>
  );
}
