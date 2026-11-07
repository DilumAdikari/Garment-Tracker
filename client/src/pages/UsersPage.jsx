import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil } from 'lucide-react';
import api, { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import { ROLE_LABELS } from '../utils/labels';
import { formatDate } from '../utils/format';

const ROLE_TONES = {
  admin: 'bg-brand-900 text-white',
  manager: 'bg-brand-50 text-brand-700',
  operator: 'bg-emerald-50 text-emerald-700',
  viewer: 'bg-slate-100 text-slate-600',
};

const BLANK = { name: '', username: '', password: '', role: 'operator', isActive: true };

export default function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | {} (new) | user
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  const load = () =>
    api
      .get('/users')
      .then(({ data }) => setUsers(data.items))
      .catch((err) => toast.error(errorMessage(err)))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setForm(BLANK);
    setEditing({});
  };

  const openEdit = (u) => {
    setForm({ name: u.name, username: u.username, password: '', role: u.role, isActive: u.isActive });
    setEditing(u);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing?._id) {
        const payload = { name: form.name, role: form.role, isActive: form.isActive };
        if (form.password) payload.password = form.password;
        await api.put(`/users/${editing._id}`, payload);
        toast.success('User updated');
      } else {
        await api.post('/users', form);
        toast.success('User created');
      }
      setEditing(null);
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (u) => {
    try {
      await api.put(`/users/${u._id}`, { isActive: !u.isActive });
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Manage who can sign in and what they are allowed to do"
        actions={
          <button className="btn-primary" onClick={openNew}>
            <Plus className="h-4 w-4" /> Add user
          </button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Object.entries(ROLE_LABELS).map(([role, label]) => (
          <div key={role} className="card p-4 text-sm">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_TONES[role]}`}>{label}</span>
            <p className="mt-2 text-slate-500">
              {{
                admin: 'Full access, including users, plants and deletions.',
                manager: 'Manage styles, job sheets and plants; edit production.',
                operator: 'Issue pieces and record daily production.',
                viewer: 'Read-only access to dashboards and reports.',
              }[role]}
            </p>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <Spinner />
        ) : users.length === 0 ? (
          <EmptyState title="No users" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Name</th><th className="th">Username</th><th className="th">Role</th>
                  <th className="th">Status</th><th className="th">Last login</th><th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50">
                    <td className="td font-medium text-slate-900">
                      {u.name}
                      {u._id === me._id && <span className="ml-2 text-xs text-slate-400">(you)</span>}
                    </td>
                    <td className="td font-mono text-xs">{u.username}</td>
                    <td className="td"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_TONES[u.role]}`}>{ROLE_LABELS[u.role]}</span></td>
                    <td className="td">
                      <button
                        disabled={u._id === me._id}
                        onClick={() => toggleActive(u)}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset disabled:cursor-not-allowed ${u.isActive ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-slate-500 ring-slate-200'}`}
                      >
                        {u.isActive ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="td text-slate-500">{u.lastLogin ? formatDate(u.lastLogin, 'dd MMM yyyy, HH:mm') : 'Never'}</td>
                    <td className="td text-right">
                      <button className="btn-ghost px-2 py-1.5" onClick={() => openEdit(u)} title="Edit"><Pencil className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?._id ? 'Edit user' : 'New user'}
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn-primary" type="submit" form="user-form" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </>
        }
      >
        <form id="user-form" onSubmit={save} className="space-y-4">
          <div>
            <label className="label" htmlFor="u-name">Full name *</label>
            <input id="u-name" className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="u-username">Username *</label>
            <input id="u-username" className="input" required disabled={!!editing?._id} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="u-password">{editing?._id ? 'New password (optional)' : 'Password *'}</label>
            <input id="u-password" type="password" className="input" minLength={6} required={!editing?._id} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="u-role">Role *</label>
            <select id="u-role" className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {Object.entries(ROLE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          {editing?._id && (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              Account active
            </label>
          )}
        </form>
      </Modal>
    </>
  );
}
