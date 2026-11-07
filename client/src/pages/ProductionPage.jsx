import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Save, Trash2, Search } from 'lucide-react';
import api, { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import EmptyState from '../components/EmptyState';
import Spinner from '../components/Spinner';
import DateRangeFilter from '../components/DateRangeFilter';
import { formatNumber, formatDate, todayISO } from '../utils/format';

const blankEntry = () => ({ issue: '', date: todayISO(), completedQuantity: '', sentOutQuantity: '', remarks: '' });

export default function ProductionPage() {
  const { canWrite, canManage } = useAuth();

  // ----- Entry form state -----
  const [plants, setPlants] = useState([]);
  const [plantId, setPlantId] = useState('');
  const [plantIssues, setPlantIssues] = useState([]);
  const [styleQuery, setStyleQuery] = useState('');
  const [entry, setEntry] = useState(blankEntry);
  const [saving, setSaving] = useState(false);
  const [loadingIssues, setLoadingIssues] = useState(false);

  // ----- History state -----
  const [history, setHistory] = useState([]);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [range, setRange] = useState({ from: '', to: '' });
  const [filterPlant, setFilterPlant] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    api.get('/plants', { params: { active: true } }).then(({ data }) => setPlants(data.items));
  }, []);

  // Load open issues for the chosen plant.
  useEffect(() => {
    setEntry(blankEntry());
    setStyleQuery('');
    if (!plantId) return setPlantIssues([]);
    setLoadingIssues(true);
    api
      .get('/issues', { params: { plant: plantId, limit: 100 } })
      .then(({ data }) => setPlantIssues(data.items.filter((i) => i.status !== 'closed')))
      .catch((err) => toast.error(errorMessage(err)))
      .finally(() => setLoadingIssues(false));
  }, [plantId]);

  const matchingIssues = useMemo(() => {
    const q = styleQuery.trim().toLowerCase();
    if (!q) return plantIssues;
    return plantIssues.filter(
      (i) => i.style?.styleNumber?.toLowerCase().includes(q) || i.jobSheet?.jobSheetNumber?.toLowerCase().includes(q)
    );
  }, [plantIssues, styleQuery]);

  const selectedIssue = plantIssues.find((i) => i._id === entry.issue);
  const selectedPending = selectedIssue ? selectedIssue.issuedQuantity - selectedIssue.completedQuantity : 0;

  const loadHistory = useCallback(() => {
    setLoadingHistory(true);
    api
      .get('/production', { params: { page, limit: 20, plant: filterPlant, ...range } })
      .then(({ data }) => {
        setHistory(data.items);
        setPages(data.pages);
      })
      .catch((err) => toast.error(errorMessage(err)))
      .finally(() => setLoadingHistory(false));
  }, [page, filterPlant, range]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => setPage(1), [filterPlant, range]);

  const submit = async (e) => {
    e.preventDefault();
    if (!entry.issue) return toast.error('Select a style / job sheet first');
    const qty = Number(entry.completedQuantity);

    setSaving(true);
    try {
      await api.post('/production', {
        issue: entry.issue,
        date: entry.date,
        completedQuantity: qty,
        sentOutQuantity: entry.sentOutQuantity === '' ? qty : Number(entry.sentOutQuantity),
        remarks: entry.remarks,
      });
      toast.success(`Recorded ${formatNumber(qty)} pcs`);
      // Keep the plant and date so the next style can be entered quickly.
      setEntry((prev) => ({ ...blankEntry(), date: prev.date }));
      setStyleQuery('');
      refreshPlantIssues();
      loadHistory();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const refreshPlantIssues = () => {
    if (!plantId) return;
    api.get('/issues', { params: { plant: plantId, limit: 100 } }).then(({ data }) => setPlantIssues(data.items.filter((i) => i.status !== 'closed')));
  };

  const removeEntry = async (row) => {
    if (!window.confirm(`Delete the ${row.completedQuantity} pcs entry for ${formatDate(row.date)}? It stays in the activity log.`)) return;
    try {
      await api.delete(`/production/${row._id}`);
      toast.success('Entry deleted');
      loadHistory();
      refreshPlantIssues();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader title="Daily production" subtitle="Record pieces completed and sent out by each plant" />

      {canWrite && (
        <form onSubmit={submit} className="card mb-8 p-5">
          <h2 className="mb-4 font-semibold text-slate-800">New production entry</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="label">Plant *</label>
              <select className="input" value={plantId} onChange={(e) => setPlantId(e.target.value)} required>
                <option value="">Select plant</option>
                {plants.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Find style no. / job sheet</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="input pl-9"
                  placeholder="Type to filter…"
                  value={styleQuery}
                  disabled={!plantId}
                  onChange={(e) => setStyleQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="label">Issue / style *</label>
              <select
                className="input"
                required
                disabled={!plantId || loadingIssues}
                value={entry.issue}
                onChange={(e) => setEntry({ ...entry, issue: e.target.value })}
              >
                <option value="">
                  {!plantId ? 'Select a plant first' : loadingIssues ? 'Loading…' : matchingIssues.length ? 'Select issue' : 'No open issues for this plant'}
                </option>
                {matchingIssues.map((i) => (
                  <option key={i._id} value={i._id}>
                    {i.style?.styleNumber} · {i.jobSheet?.jobSheetNumber} · {i.issueNumber} · pending {formatNumber(i.issuedQuantity - i.completedQuantity)}
                  </option>
                ))}
              </select>
              {selectedIssue && (
                <p className="mt-1.5 text-xs text-slate-500">
                  Issued {formatNumber(selectedIssue.issuedQuantity)} · Completed {formatNumber(selectedIssue.completedQuantity)} · <span className="font-medium text-slate-700">Pending {formatNumber(selectedPending)}</span>
                </p>
              )}
            </div>

            <div>
              <label className="label">Production date *</label>
              <input type="date" className="input" required value={entry.date} onChange={(e) => setEntry({ ...entry, date: e.target.value })} />
            </div>

            <div>
              <label className="label">Completed (pcs) *</label>
              <input
                type="number"
                min="0"
                max={selectedPending || undefined}
                className="input"
                required
                value={entry.completedQuantity}
                onChange={(e) => setEntry({ ...entry, completedQuantity: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Sent out (pcs)</label>
              <input
                type="number"
                min="0"
                className="input"
                placeholder="Same as completed"
                value={entry.sentOutQuantity}
                onChange={(e) => setEntry({ ...entry, sentOutQuantity: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Remarks</label>
              <input className="input" value={entry.remarks} onChange={(e) => setEntry({ ...entry, remarks: e.target.value })} />
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">If an entry already exists for this issue on this date, it will be updated.</p>
            <button type="submit" className="btn-primary" disabled={saving || !entry.issue}>
              <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save entry'}
            </button>
          </div>
        </form>
      )}

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="font-semibold text-slate-800">Production history</h2>
          <div className="flex flex-wrap items-center gap-3">
            <select className="input w-auto" value={filterPlant} onChange={(e) => setFilterPlant(e.target.value)} aria-label="Filter by plant">
              <option value="">All plants</option>
              {plants.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
            <DateRangeFilter value={range} onChange={setRange} />
          </div>
        </div>

        {loadingHistory ? (
          <Spinner />
        ) : history.length === 0 ? (
          <EmptyState title="No production entries" message="Entries you record will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Date</th>
                  <th className="th">Plant</th>
                  <th className="th">Style</th>
                  <th className="th">Job sheet</th>
                  <th className="th text-right">Completed</th>
                  <th className="th text-right">Sent out</th>
                  <th className="th">Entered by</th>
                  <th className="th">Remarks</th>
                  {canManage && <th className="th"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((row) => (
                  <tr key={row._id} className="hover:bg-slate-50">
                    <td className="td">{formatDate(row.date)}</td>
                    <td className="td font-medium text-slate-900">{row.plant?.name}</td>
                    <td className="td">{row.style?.styleNumber}</td>
                    <td className="td">{row.jobSheet?.jobSheetNumber}</td>
                    <td className="td text-right font-semibold text-emerald-700">{formatNumber(row.completedQuantity)}</td>
                    <td className="td text-right">{formatNumber(row.sentOutQuantity)}</td>
                    <td className="td">{row.enteredBy?.name || '—'}</td>
                    <td className="td max-w-[200px] truncate" title={row.remarks}>{row.remarks || '—'}</td>
                    {canManage && (
                      <td className="td text-right">
                        <button className="btn-ghost px-2 py-1.5 text-red-600 hover:bg-red-50" onClick={() => removeEntry(row)} title="Delete entry">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pages={pages} onChange={setPage} />
      </div>
    </>
  );
}
