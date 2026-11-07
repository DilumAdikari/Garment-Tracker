import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import api, { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import PageHeader from './PageHeader';
import Modal from './Modal';
import EmptyState from './EmptyState';
import Spinner from './Spinner';

/**
 * Generic list + create/edit/delete screen for simple master records.
 *
 * columns: [{ key, label, render? }]
 * fields:  [{ name, label, type?: 'text'|'number'|'textarea'|'select'|'checkbox',
 *             required?, options?: [{value,label}], optionsUrl?, optionLabel?, span? }]
 */
export default function MasterCrud({ title, subtitle, endpoint, singular, columns, fields, searchable = true, emptyValues = {}, canDelete = false }) {
  const { canManage } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null); // null = closed, {} = new, doc = edit
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [dynamicOptions, setDynamicOptions] = useState({});

  const load = useCallback(() => {
    setLoading(true);
    api
      .get(endpoint, { params: { search } })
      .then(({ data }) => setItems(data.items))
      .catch((err) => toast.error(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [endpoint, search]);

  useEffect(() => {
    const t = setTimeout(load, 250); // debounce search
    return () => clearTimeout(t);
  }, [load]);

  // Load select options that come from other endpoints.
  useEffect(() => {
    fields
      .filter((f) => f.optionsUrl)
      .forEach((f) =>
        api.get(f.optionsUrl).then(({ data }) =>
          setDynamicOptions((prev) => ({
            ...prev,
            [f.name]: data.items.map((it) => ({ value: it._id, label: f.optionLabel ? f.optionLabel(it) : it.name })),
          }))
        )
      );
  }, [fields]);

  const openNew = () => {
    setForm({ ...emptyValues });
    setEditing({});
  };

  const openEdit = (doc) => {
    const values = {};
    fields.forEach((f) => {
      const v = doc[f.name];
      values[f.name] = v && typeof v === 'object' && v._id ? v._id : v ?? (f.type === 'checkbox' ? false : '');
    });
    setForm(values);
    setEditing(doc);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      fields.forEach((f) => {
        if (f.type === 'number') payload[f.name] = payload[f.name] === '' ? undefined : Number(payload[f.name]);
      });
      if (editing?._id) {
        await api.put(`${endpoint}/${editing._id}`, payload);
        toast.success(`${singular} updated`);
      } else {
        await api.post(endpoint, payload);
        toast.success(`${singular} added`);
      }
      setEditing(null);
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (doc) => {
    if (!window.confirm(`Delete this ${singular.toLowerCase()}? Records in use cannot be deleted.`)) return;
    try {
      await api.delete(`${endpoint}/${doc._id}`);
      toast.success(`${singular} deleted`);
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const toggleActive = async (doc) => {
    try {
      await api.put(`${endpoint}/${doc._id}`, { isActive: !doc.isActive });
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const renderField = (f) => {
    const value = form[f.name] ?? '';
    const set = (v) => setForm((prev) => ({ ...prev, [f.name]: v }));
    const common = { id: f.name, className: 'input', required: f.required, value, onChange: (e) => set(e.target.value) };

    if (f.type === 'checkbox') {
      return (
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600" checked={!!form[f.name]} onChange={(e) => set(e.target.checked)} />
          {f.label}
        </label>
      );
    }
    if (f.type === 'textarea') return <textarea rows={3} {...common} />;
    if (f.type === 'select') {
      const options = f.options || dynamicOptions[f.name] || [];
      return (
        <select {...common}>
          <option value="">Select…</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      );
    }
    return <input type={f.type || 'text'} {...common} />;
  };

  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <>
            {searchable && (
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input className="input w-64 pl-9" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            )}
            {canManage && (
              <button className="btn-primary" onClick={openNew}>
                <Plus className="h-4 w-4" /> Add {singular.toLowerCase()}
              </button>
            )}
          </>
        }
      />

      <div className="card overflow-hidden">
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState title={`No ${title.toLowerCase()} yet`} message={search ? 'Try a different search.' : `Add your first ${singular.toLowerCase()} to get started.`} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  {columns.map((c) => <th key={c.key} className="th">{c.label}</th>)}
                  {'isActive' in (items[0] || {}) && <th className="th">Status</th>}
                  {canManage && <th className="th text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((doc) => (
                  <tr key={doc._id} className="hover:bg-slate-50">
                    {columns.map((c) => (
                      <td key={c.key} className="td">{c.render ? c.render(doc) : doc[c.key] ?? '—'}</td>
                    ))}
                    {'isActive' in doc && (
                      <td className="td">
                        <button
                          disabled={!canManage}
                          onClick={() => toggleActive(doc)}
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${doc.isActive ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-slate-500 ring-slate-200'}`}
                        >
                          {doc.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                    )}
                    {canManage && (
                      <td className="td text-right">
                        <button className="btn-ghost px-2 py-1.5" onClick={() => openEdit(doc)} title="Edit"><Pencil className="h-4 w-4" /></button>
                        {canDelete && (
                          <button className="btn-ghost px-2 py-1.5 text-red-600 hover:bg-red-50" onClick={() => remove(doc)} title="Delete"><Trash2 className="h-4 w-4" /></button>
                        )}
                      </td>
                    )}
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
        title={editing?._id ? `Edit ${singular.toLowerCase()}` : `New ${singular.toLowerCase()}`}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn-primary" type="submit" form="master-form" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        <form id="master-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.name} className={f.span === 2 || f.type === 'textarea' ? 'sm:col-span-2' : ''}>
              {f.type !== 'checkbox' && <label htmlFor={f.name} className="label">{f.label}{f.required ? ' *' : ''}</label>}
              {renderField(f)}
            </div>
          ))}
        </form>
      </Modal>
    </>
  );
}
