import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FileSpreadsheet, FileText, Download } from 'lucide-react';
import api, { errorMessage, downloadFile } from '../api/client';
import PageHeader from '../components/PageHeader';
import DateRangeFilter from '../components/DateRangeFilter';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import Spinner from '../components/Spinner';
import { formatNumber, formatDate } from '../utils/format';

const REPORT_TYPES = [
  { id: 'issues', label: 'Issued vs completed', hint: 'Per issue: issued, completed and pending by issue date' },
  { id: 'production', label: 'Daily production', hint: 'Every daily entry by production date, with sent-out totals' },
];

export default function ReportsPage() {
  const [type, setType] = useState('issues');
  const [range, setRange] = useState({ from: '', to: '' });
  const [plant, setPlant] = useState('');
  const [plants, setPlants] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState('');

  useEffect(() => {
    api.get('/plants').then(({ data }) => setPlants(data.items));
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/reports/${type}`, { params: { ...range, plant } })
      .then(({ data }) => setReport(data))
      .catch((err) => toast.error(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [type, range, plant]);

  const exportAs = async (format) => {
    setExporting(format);
    try {
      await downloadFile(`/reports/${type}/${format}`, { ...range, plant }, `${type}-report.${format === 'excel' ? 'xlsx' : 'pdf'}`);
      toast.success(`${format === 'excel' ? 'Excel' : 'PDF'} downloaded`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setExporting('');
    }
  };

  const current = REPORT_TYPES.find((t) => t.id === type);
  const isIssues = type === 'issues';

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle={current.hint}
        actions={
          <>
            <button className="btn-secondary" disabled={!!exporting || !report?.rows.length} onClick={() => exportAs('excel')}>
              <FileSpreadsheet className="h-4 w-4" /> {exporting === 'excel' ? 'Exporting…' : 'Excel'}
            </button>
            <button className="btn-primary" disabled={!!exporting || !report?.rows.length} onClick={() => exportAs('pdf')}>
              <FileText className="h-4 w-4" /> {exporting === 'pdf' ? 'Exporting…' : 'PDF'}
            </button>
          </>
        }
      />

      <div className="card mb-4 flex flex-col gap-4 p-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="inline-flex w-full rounded-lg bg-slate-100 p-1 xl:w-auto">
          {REPORT_TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setType(t.id)}
              className={`flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition xl:flex-none ${
                type === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select className="input w-auto" value={plant} onChange={(e) => setPlant(e.target.value)} aria-label="Plant">
            <option value="">All plants</option>
            {plants.map((p) => (
              <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </select>
          <DateRangeFilter value={range} onChange={setRange} />
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading && !report ? (
          <Spinner />
        ) : !report?.rows.length ? (
          <EmptyState title="No records for these filters" message="Widen the date range or clear the plant filter." />
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 text-sm text-slate-500">
              <span>{formatNumber(report.count)} rows</span>
              {loading && <Download className="h-4 w-4 animate-pulse" />}
            </div>
            <div className="max-h-[65vh] overflow-auto">
              <table className="w-full min-w-[800px]">
                <thead className="sticky top-0 z-10 bg-slate-50">
                  {isIssues ? (
                    <tr>
                      <th className="th">Issue no.</th><th className="th">Issue date</th><th className="th">Plant</th>
                      <th className="th">Style</th><th className="th">Job sheet</th>
                      <th className="th text-right">Issued</th><th className="th text-right">Completed</th>
                      <th className="th text-right">Pending</th><th className="th">Status</th>
                    </tr>
                  ) : (
                    <tr>
                      <th className="th">Date</th><th className="th">Plant</th><th className="th">Style</th>
                      <th className="th">Job sheet</th><th className="th text-right">Completed</th><th className="th text-right">Sent out</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.rows.map((r, i) =>
                    isIssues ? (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="td font-mono text-xs">{r.issueNumber}</td>
                        <td className="td">{formatDate(r.issueDate)}</td>
                        <td className="td">{r.plant}</td>
                        <td className="td">{r.style}</td>
                        <td className="td">{r.jobSheet}</td>
                        <td className="td text-right">{formatNumber(r.issued)}</td>
                        <td className="td text-right text-emerald-700">{formatNumber(r.completed)}</td>
                        <td className="td text-right font-medium">{formatNumber(r.pending)}</td>
                        <td className="td"><StatusBadge status={r.status} /></td>
                      </tr>
                    ) : (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="td">{formatDate(r.date)}</td>
                        <td className="td">{r.plant}</td>
                        <td className="td">{r.style}</td>
                        <td className="td">{r.jobSheet}</td>
                        <td className="td text-right text-emerald-700">{formatNumber(r.completed)}</td>
                        <td className="td text-right">{formatNumber(r.sentOut)}</td>
                      </tr>
                    )
                  )}
                </tbody>
                <tfoot className="sticky bottom-0 bg-slate-100 font-semibold">
                  {isIssues ? (
                    <tr>
                      <td className="td" colSpan={5}>Total</td>
                      <td className="td text-right">{formatNumber(report.totals.issued)}</td>
                      <td className="td text-right">{formatNumber(report.totals.completed)}</td>
                      <td className="td text-right">{formatNumber(report.totals.pending)}</td>
                      <td className="td" />
                    </tr>
                  ) : (
                    <tr>
                      <td className="td" colSpan={4}>Total</td>
                      <td className="td text-right">{formatNumber(report.totals.completed)}</td>
                      <td className="td text-right">{formatNumber(report.totals.sentOut)}</td>
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
