import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Search, Eye } from 'lucide-react';
import api, { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import ProgressBar from '../components/ProgressBar';
import Pagination from '../components/Pagination';
import EmptyState from '../components/EmptyState';
import Spinner from '../components/Spinner';
import DateRangeFilter from '../components/DateRangeFilter';
import { formatNumber, formatDate, todayISO } from '../utils/format';

const EMPTY_FORM = {
  style: '',
  jobSheet: '',
  plant: '',
  issuedQuantity: '',
  issueDate: todayISO(),
  expectedCompletionDate: '',
  remarks: '',
};

export default function IssuesPage() {
  const { canWrite } = useAuth();

  const [items, setItems] = useState([]);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [range, setRange] = useState({ from: '', to: '' });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [styles, setStyles] = useState([]);
  const [plants, setPlants] = useState([]);
  const [sheets, setSheets] = useState([]);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get('/issues', { params: { page, limit: 15, search, status, ...range } })
      .then(({ data }) => {
        setItems(data.items);
        setPages(data.pages);
      })
      .catch((err) => toast.error(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [page, search, status, range]);

  useEffect(() => {
    load();
  }, [load]);

  // Reset to first page whenever filters change.
  useEffect(() => setPage(1), [search, status, range]);

  const openForm = async () => {
    setForm({ ...EMPTY_FORM, issueDate: todayISO() });
    setSheets([]);
    setShowForm(true);
    const [s, p] = await Promise.all([api.get('/styles', { params: { active: true } }), api.get('/plants', { params: { active: true } })]);
    setStyles(s.data.items);
    setPlants(p.data.items);
  };

  // Job sheets depend on the chosen style.
  const onStyleChange = async (styleId) => {
    setForm((f) => ({ ...f, style: styleId, jobSheet: '' }));
    if (!styleId) return setSheets([]);
    const { data } = await api.get(`/job-sheets/by-style/${styleId}`);
    setSheets(data.items);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/issues', { ...form, issuedQuantity: Number(form.issuedQuantity) });
      toast.success('Cut pieces issued to plant');
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const selectedSheet = sheets.find((s) => s._id === form.jobSheet);

  return (
    <>
      <PageHeader
        title="Issues"
        subtitle="Cut pieces issued to production plants"
        actions={
          canWrite && (
            <button className="btn-primary" onClick={openForm}>
              <Plus className="h-4 w-4" /> Issue to plant
            </button>
          )
        }
      />

      <div className="card mb-4 flex flex-col gap-3 p-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative w-full xl:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search style no., job sheet or issue no."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="">All statuses</option>
            <option value="issued">Issued</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="closed">Closed</option>
          </select>
          <DateRangeFilter value={range} onChange={setRange} label="Issued" />
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState title="No issues found" message="Adjust the filters or issue cut pieces to a plant." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Issue no.</th>
                  <th className="th">Issue date</th>
                  <th className="th">Plant</th>
                  <th className="th">Style</th>
                  <th className="th">Job sheet</th>
                  <th className="th text-right">Issued</th>
                  <th className="th text-right">Completed</th>
                  <th className="th text-right">Pending</th>
                  <th className="th w-44">Progress</th>
                  <th className="th">Status</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((i) => {
                  const pending = Math.max(i.issuedQuantity - i.completedQuantity, 0);
                  const percent = i.issuedQuantity ? Math.round((i.completedQuantity / i.issuedQuantity) * 1000) / 10 : 0;
                  return (
                    <tr key={i._id} className="hover:bg-slate-50">
                      <td className="td font-mono text-xs text-slate-600">{i.issueNumber}</td>
                      <td className="td">{formatDate(i.issueDate)}</td>
                      <td className="td font-medium text-slate-900">{i.plant?.name}</td>
                      <td className="td">{i.style?.styleNumber}</td>
                      <td className="td">{i.jobSheet?.jobSheetNumber}</td>
                      <td className="td text-right">{formatNumber(i.issuedQuantity)}</td>
                      <td className="td text-right text-emerald-700">{formatNumber(i.completedQuantity)}</td>
                      <td className="td text-right font-medium">{formatNumber(pending)}</td>
                      <td className="td"><ProgressBar percent={percent} /></td>
                      <td className="td"><StatusBadge status={i.status} /></td>
                      <td className="td text-right">
                        <Link to={`/issues/${i._id}`} className="btn-ghost px-2.5 py-1.5" title="View details">
                          <Eye className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pages={pages} onChange={setPage} />
      </div>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Issue cut pieces to plant"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn-primary" form="issue-form" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Issue pieces'}
            </button>
          </>
        }
      >
        <form id="issue-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Style number *</label>
            <select className="input" required value={form.style} onChange={(e) => onStyleChange(e.target.value)}>
              <option value="">Select style</option>
              {styles.map((s) => (
                <option key={s._id} value={s._id}>{s.styleNumber}{s.description ? ` — ${s.description}` : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Job sheet *</label>
            <select className="input" required disabled={!form.style} value={form.jobSheet} onChange={(e) => setForm({ ...form, jobSheet: e.target.value })}>
              <option value="">{form.style ? (sheets.length ? 'Select job sheet' : 'No open job sheets for this style') : 'Choose a style first'}</option>
              {sheets.map((s) => (
                <option key={s._id} value={s._id}>{s.jobSheetNumber}{s.color ? ` (${s.color})` : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Plant *</label>
            <select className="input" required value={form.plant} onChange={(e) => setForm({ ...form, plant: e.target.value })}>
              <option value="">Select plant</option>
              {plants.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Issued quantity (pcs) *</label>
            <input
              type="number"
              min="1"
              className="input"
              required
              value={form.issuedQuantity}
              onChange={(e) => setForm({ ...form, issuedQuantity: e.target.value })}
            />
            {selectedSheet?.targetQuantity > 0 && (
              <p className="mt-1 text-xs text-slate-500">Job sheet target: {formatNumber(selectedSheet.targetQuantity)} pcs</p>
            )}
          </div>

          <div>
            <label className="label">Issue date *</label>
            <input type="date" className="input" required value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} />
          </div>

          <div>
            <label className="label">Expected completion</label>
            <input type="date" className="input" value={form.expectedCompletionDate} onChange={(e) => setForm({ ...form, expectedCompletionDate: e.target.value })} />
          </div>

          <div className="sm:col-span-2">
            <label className="label">Remarks</label>
            <textarea rows={2} className="input" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
          </div>
        </form>
      </Modal>
    </>
  );
}
