export default function Spinner({ fullPage = false, className = '' }) {
  const spinner = (
    <div
      className={`h-7 w-7 animate-spin rounded-full border-2 border-brand-100 border-t-brand-700 ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
  if (!fullPage) return <div className="flex justify-center py-10">{spinner}</div>;
  return <div className="flex h-screen items-center justify-center bg-slate-50">{spinner}</div>;
}
