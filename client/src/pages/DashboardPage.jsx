import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Package, CheckCircle2, Clock, CalendarDays } from 'lucide-react';
import api, { errorMessage } from '../api/client';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import ProgressBar from '../components/ProgressBar';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import DateRangeFilter from '../components/DateRangeFilter';
import { formatNumber, formatDate } from '../utils/format';
import { activityLabel } from '../utils/labels';

const PIE_COLORS = ['#94a3b8', '#f59e0b', '#10b981', '#1e3a5f'];
const STATUS_LABELS = { issued: 'Issued', in_progress: 'In progress', completed: 'Completed', closed: 'Closed' };

export default function DashboardPage() {
  const [range, setRange] = useState({ from: '', to: '' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get('/dashboard', { params: range })
      .then(({ data }) => setData(data))
      .catch((err) => toast.error(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [range]);

  if (loading && !data) return <Spinner />;
  if (!data) return null;

  const { kpis, dailyTrend, plantProgress, styleProgress, statusBreakdown, recentActivity } = data;
  const isEmpty = kpis.totalIssued === 0 && dailyTrend.length === 0;

  return (
    <>
      <PageHeader
        title="Production overview"
        subtitle="Issued, completed and remaining pieces across all plants"
        actions={<DateRangeFilter value={range} onChange={setRange} />}
      />

      {isEmpty ? (
        <div className="card">
          <EmptyState
            title="No production data yet"
            message="Start by issuing cut pieces to a plant, then record daily completions."
            action={<Link to="/issues" className="btn-primary">Go to issues</Link>}
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard label="Total issued" value={formatNumber(kpis.totalIssued)} hint={`${kpis.activeIssues} issues`} icon={Package} tone="brand" />
            <StatCard label="Total completed" value={formatNumber(kpis.totalCompleted)} hint={`${kpis.completionPercent}% of issued`} icon={CheckCircle2} tone="green" />
            <StatCard label="Remaining" value={formatNumber(kpis.remaining)} hint="Still with plants" icon={Clock} tone="amber" />
            <StatCard label="Completed today" value={formatNumber(kpis.todayCompleted)} hint="From today's entries" icon={CalendarDays} tone="slate" />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <div className="card p-5 xl:col-span-2">
              <h2 className="mb-4 font-semibold text-slate-800">Daily completed pieces</h2>
              {dailyTrend.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={dailyTrend} margin={{ left: -10, right: 10 }}>
                    <defs>
                      <linearGradient id="fillCompleted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2f6fb0" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#2f6fb0" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tickFormatter={(d) => formatDate(d, 'dd MMM')} tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip labelFormatter={(d) => formatDate(d)} />
                    <Area type="monotone" dataKey="completed" name="Completed" stroke="#2f6fb0" fill="url(#fillCompleted)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-16 text-center text-sm text-slate-500">No daily entries in this period.</p>
              )}
            </div>

            <div className="card p-5">
              <h2 className="mb-4 font-semibold text-slate-800">Issues by status</h2>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={statusBreakdown.map((s) => ({ ...s, name: STATUS_LABELS[s.status] || s.status }))}
                    dataKey="count"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={3}
                  >
                    {statusBreakdown.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <div className="card overflow-hidden">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="font-semibold text-slate-800">Plant-wise progress</h2>
              </div>
              {plantProgress.length ? (
                <>
                  <div className="p-5">
                    <ResponsiveContainer width="100%" height={Math.max(180, plantProgress.length * 48)}>
                      <BarChart data={plantProgress} layout="vertical" margin={{ left: 10, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 12 }} />
                        <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="completed" name="Completed" stackId="a" fill="#10b981" />
                        <Bar dataKey="pending" name="Pending" stackId="a" fill="#cbd5e1" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <table className="w-full">
                    <thead className="bg-slate-50"><tr>
                      <th className="th">Plant</th><th className="th text-right">Issued</th><th className="th text-right">Pending</th><th className="th w-48">Progress</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {plantProgress.map((p) => (
                        <tr key={p.plantId}>
                          <td className="td font-medium text-slate-900">{p.name}</td>
                          <td className="td text-right">{formatNumber(p.issued)}</td>
                          <td className="td text-right">{formatNumber(p.pending)}</td>
                          <td className="td"><ProgressBar percent={p.percent} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : (
                <EmptyState title="No plant data" />
              )}
            </div>

            <div className="card overflow-hidden">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="font-semibold text-slate-800">Style-wise progress</h2>
              </div>
              {styleProgress.length ? (
                <table className="w-full">
                  <thead className="bg-slate-50"><tr>
                    <th className="th">Style</th><th className="th text-right">Issued</th><th className="th text-right">Pending</th><th className="th w-48">Progress</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {styleProgress.map((s) => (
                      <tr key={s.styleId} className="hover:bg-slate-50">
                        <td className="td font-medium text-slate-900">{s.styleNumber}</td>
                        <td className="td text-right">{formatNumber(s.issued)}</td>
                        <td className="td text-right">{formatNumber(s.pending)}</td>
                        <td className="td"><ProgressBar percent={s.percent} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyState title="No style data" />
              )}
            </div>
          </div>

          <div className="card mt-6">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="font-semibold text-slate-800">Recent activity</h2>
              <Link to="/activity" className="text-sm font-medium text-brand-600 hover:underline">View all</Link>
            </div>
            {recentActivity.length ? (
              <ul className="divide-y divide-slate-100">
                {recentActivity.map((a) => (
                  <li key={a._id} className="flex items-center justify-between gap-4 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-slate-800">{a.description}</p>
                      <p className="text-xs text-slate-500">{a.username || 'system'} · {activityLabel(a.action)}</p>
                    </div>
                    <time className="shrink-0 text-xs text-slate-400">{formatDate(a.createdAt, 'dd MMM, HH:mm')}</time>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No activity yet" />
            )}
          </div>
        </>
      )}
    </>
  );
}
