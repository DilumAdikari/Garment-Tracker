import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { errorMessage } from '../api/client';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import { formatDate } from '../utils/format';
import { activityLabel, ACTIVITY_LABELS } from '../utils/labels';

const ACTION_TONES = {
  CREATE: 'bg-emerald-50 text-emerald-700',
  ISSUE: 'bg-brand-50 text-brand-700',
  PRODUCTION_ENTRY: 'bg-emerald-50 text-emerald-700',
  PRODUCTION_UPDATE: 'bg-amber-50 text-amber-700',
  UPDATE: 'bg-amber-50 text-amber-700',
  DELETE: 'bg-red-50 text-red-700',
  PRODUCTION_DELETE: 'bg-red-50 text-red-700',
  LOGIN: 'bg-slate-100 text-slate-700',
  EXPORT: 'bg-violet-50 text-violet-700',
};

export default function ActivityPage() {
  const [items, setItems] = useState([]);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get('/activity', { params: { page, limit: 25, action } })
      .then(({ data }) => {
        setItems(data.items);
        setPages(data.pages);
      })
      .catch((err) => toast.error(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [page, action]);

  useEffect(() => setPage(1), [action]);

  return (
    <>
      <PageHeader
        title="Activity log"
        subtitle="Every issue, entry, change and export, with who did it and when"
        actions={
          <select className="input w-auto" value={action} onChange={(e) => setAction(e.target.value)} aria-label="Filter by action">
            <option value="">All actions</option>
            {Object.keys(ACTIVITY_LABELS).map((k) => (
              <option key={k} value={k}>{ACTIVITY_LABELS[k]}</option>
            ))}
          </select>
        }
      />

      <div className="card overflow-hidden">
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState title="No activity recorded" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((a) => (
              <li key={a._id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_TONES[a.action] || 'bg-slate-100 text-slate-700'}`}>
                      {activityLabel(a.action)}
                    </span>
                    <span className="text-xs text-slate-400">{a.entity}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-800">{a.description}</p>
                </div>
                <div className="shrink-0 text-left text-xs text-slate-500 sm:text-right">
                  <p className="font-medium text-slate-700">{a.username || 'system'}</p>
                  <p>{formatDate(a.createdAt, 'dd MMM yyyy, HH:mm')}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        <Pagination page={page} pages={pages} onChange={setPage} />
      </div>
    </>
  );
}
