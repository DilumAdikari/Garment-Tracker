import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Lock, Unlock, Trash2 } from 'lucide-react';
import api, { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import ProgressBar from '../components/ProgressBar';
import StatCard from '../components/StatCard';
import EmptyState from '../components/EmptyState';
import Spinner from '../components/Spinner';
import { Package, CheckCircle2, Clock } from 'lucide-react';
import { formatNumber, formatDate } from '../utils/format';

export default function IssueDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canWrite, canManage } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get(`/issues/${id}`)
      .then(({ data }) => setData(data))
      .catch((err) => toast.error(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleClosed = async () => {
    const closing = data.issue.status !== 'closed';
    try {
      await api.put(`/issues/${id}`, { closed: closing });
      toast.success(closing ? 'Issue closed' : 'Issue reopened');
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const removeIssue = async () => {
    if (!window.confirm('Delete this issue? This cannot be undone.')) return;
    try {
      await api.delete(`/issues/${id}`);
      toast.success('Issue deleted');
      navigate('/issues');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  if (loading && !data) return <Spinner />;
  if (!data) return <EmptyState title="Issue not found" action={<Link to="/issues" className="btn-secondary">Back to issues</Link>} />;

  const { issue, entries } = data;
  const pending = Math.max(issue.issuedQuantity - issue.completedQuantity, 0);
  const percent = issue.issuedQuantity ? Math.round((issue.completedQuantity / issue.issuedQuantity) * 1000) / 10 : 0;

  return (
    <>
      <Link to="/issues" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> Back to issues
      </Link>

      <PageHeader
        title={issue.issueNumber}
        subtitle={`${issue.plant?.name} · Style ${issue.style?.styleNumber} · Job sheet ${issue.jobSheet?.jobSheetNumber}`}
        actions={
          <>
            <StatusBadge status={issue.status} />
            {canWrite && (
              <button className="btn-secondary" onClick={toggleClosed}>
                {issue.status === 'closed' ? <><Unlock className="h-4 w-4" /> Reopen</> : <><Lock className="h-4 w-4" /> Close issue</>}
              </button>
            )}
            {canManage && (
              <button className="btn-danger" onClick={removeIssue}>
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Issued" value={formatNumber(issue.issuedQuantity)} hint={`Issued on ${formatDate(issue.issueDate)}`} icon={Package} tone="brand" />
        <StatCard label="Completed" value={formatNumber(issue.completedQuantity)} hint={`${percent}% complete`} icon={CheckCircle2} tone="green" />
        <StatCard label="Pending" value={formatNumber(pending)} hint={issue.expectedCompletionDate ? `Expected ${formatDate(issue.expectedCompletionDate)}` : 'No target date'} icon={Clock} tone="amber" />
      </div>

      <div className="card mt-6 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Progress</h2>
          <span className="text-sm text-slate-500">{formatNumber(issue.completedQuantity)} of {formatNumber(issue.issuedQuantity)} pcs</span>
        </div>
        <ProgressBar percent={percent} />
        {issue.remarks && <p className="mt-4 text-sm text-slate-600"><span className="font-medium">Remarks:</span> {issue.remarks}</p>}
      </div>

      <div className="card mt-6 overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-800">Daily production history</h2>
        </div>
        {entries.length === 0 ? (
          <EmptyState
            title="No production recorded yet"
            message="Record the daily count from the plant on the Daily Production page."
            action={canWrite && <Link to="/production" className="btn-primary">Record production</Link>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Date</th>
                  <th className="th text-right">Completed</th>
                  <th className="th text-right">Sent out</th>
                  <th className="th">Entered by</th>
                  <th className="th">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((e) => (
                  <tr key={e._id}>
                    <td className="td">{formatDate(e.date)}</td>
                    <td className="td text-right font-semibold text-emerald-700">{formatNumber(e.completedQuantity)}</td>
                    <td className="td text-right">{formatNumber(e.sentOutQuantity)}</td>
                    <td className="td">{e.enteredBy?.name || '—'}</td>
                    <td className="td">{e.remarks || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
