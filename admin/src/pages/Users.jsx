import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiTrash2, FiUser } from 'react-icons/fi';
import api from '../api/client.js';
import Modal from '../components/Modal.jsx';

const ROLES = ['admin', 'cfo', 'sales', 'viewer'];
const roleColor = {
  admin: 'pill pill-critical',
  cfo: 'pill pill-red',
  sales: 'pill pill-yellow',
  viewer: 'pill pill-green',
};
const blank = { email: '', full_name: '', role: 'viewer', language: 'en', password: '', is_active: true };

export default function Users() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);

  const load = () => {
    setLoading(true);
    api.get('/users').then((r) => setRows(r.data)).catch((e) => toast.error(e.response?.data?.error || 'Load failed')).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openAdd = () => { setEditing(null); setForm(blank); setModal(true); };
  const openEdit = (u) => { setEditing(u); setForm({ ...u, password: '' }); setModal(true); };

  const save = async () => {
    try {
      if (editing) {
        const patch = { full_name: form.full_name, role: form.role, language: form.language, is_active: form.is_active };
        if (form.password) patch.password = form.password;
        await api.put(`/users/${editing.id}`, patch);
      } else {
        await api.post('/users', form);
      }
      toast.success('Saved');
      setModal(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Save failed');
    }
  };

  const remove = async (u) => {
    if (!window.confirm(`Delete user ${u.email}?`)) return;
    try {
      await api.delete(`/users/${u.id}`);
      toast.success('Deleted');
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Delete failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">Manage who can access the system and what they can do.</p>
        <button className="btn-primary" onClick={openAdd}><FiPlus /> Add User</button>
      </div>

      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Name</th><th className="th">Email</th><th className="th">Role</th>
              <th className="th">Lang</th><th className="th">Active</th><th className="th text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td className="td text-center py-10 text-slate-400" colSpan={6}>Loading…</td></tr>
            ) : rows.map((u) => (
              <tr key={u.id} className="hover:bg-brand-50/40">
                <td className="td font-semibold flex items-center gap-2"><FiUser className="text-slate-400" /> {u.full_name}</td>
                <td className="td">{u.email}</td>
                <td className="td"><span className={roleColor[u.role]}>{u.role}</span></td>
                <td className="td uppercase">{u.language}</td>
                <td className="td"><span className={`pill ${u.is_active ? 'pill-green' : 'pill-critical'}`}>{u.is_active ? 'Active' : 'Disabled'}</span></td>
                <td className="td">
                  <div className="flex justify-end gap-1">
                    <button className="p-1.5 rounded-md text-slate-500 hover:bg-brand-100 hover:text-brand-700" onClick={() => openEdit(u)}><FiEdit2 /></button>
                    <button className="p-1.5 rounded-md text-slate-500 hover:bg-red-100 hover:text-red-600" onClick={() => remove(u)}><FiTrash2 /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal} title={editing ? 'Edit User' : 'Add User'} onClose={() => setModal(false)}
        footer={<><button className="btn-ghost" onClick={() => setModal(false)}>Cancel</button><button className="btn-primary" onClick={save}>Save</button></>}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="label">Full Name</label><input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div><label className="label">Email</label><input className="input" type="email" value={form.email} disabled={!!editing} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><label className="label">Role</label>
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div><label className="label">Language</label>
            <select className="input" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
              <option value="en">English</option><option value="ar">العربية</option>
            </select>
          </div>
          <div><label className="label">{editing ? 'New Password (optional)' : 'Password'}</label><input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
          <div className="flex items-center gap-2 pt-6">
            <input type="checkbox" id="active" checked={!!form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            <label htmlFor="active" className="text-sm font-semibold text-slate-600">Active</label>
          </div>
        </div>
      </Modal>
    </div>
  );
}
