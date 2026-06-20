import { useEffect, useState } from 'react';
import api from '../api/client.js';
import { fmtDate } from '../utils/format.js';

const actionColor = {
  create: 'pill pill-green',
  update: 'pill pill-yellow',
  delete: 'pill pill-critical',
};

export default function Audit() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/audit').then((r) => setRows(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">A full history of every change made in the system.</p>
      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">When</th><th className="th">User</th><th className="th">Action</th>
              <th className="th">Entity</th><th className="th">Record ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td className="td text-center py-10 text-slate-400" colSpan={5}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td className="td text-center py-10 text-slate-400" colSpan={5}>No activity yet.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} className="hover:bg-brand-50/40">
                <td className="td">{new Date(r.created_at).toLocaleString()}</td>
                <td className="td font-semibold">{r.user_email || '—'}</td>
                <td className="td"><span className={actionColor[r.action] || 'pill pill-yellow'}>{r.action}</span></td>
                <td className="td">{r.entity}</td>
                <td className="td text-slate-400 text-xs">{r.entity_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
