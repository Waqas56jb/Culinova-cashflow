import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiDownload } from 'react-icons/fi';
import api from '../api/client.js';
import { useApp } from '../context/AppContext.jsx';
import { money, num, pct, fmtDate, statusPill, convert } from '../utils/format.js';
import Modal from './Modal.jsx';

const emptyForm = (cols) =>
  cols.reduce((acc, c) => {
    if (c.computed) return acc;
    acc[c.key] = c.type === 'checkbox' ? false : '';
    return acc;
  }, {});

export default function ResourcePage({ config }) {
  const { t, i18n } = useTranslation();
  const { user, displayCurrency, rates } = useApp();
  const { endpoint, columns } = config;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm(columns));
  const [saving, setSaving] = useState(false);

  const canWrite = ['admin', 'cfo', 'sales'].includes(user?.role);
  const canDelete = ['admin', 'cfo'].includes(user?.role);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(endpoint);
      setRows(data);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [endpoint]);

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const s = q.toLowerCase();
    return rows.filter((r) =>
      columns.some((c) => String(r[c.key] ?? '').toLowerCase().includes(s))
    );
  }, [rows, q, columns]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm(columns));
    setModal(true);
  };
  const openEdit = (row) => {
    setEditing(row);
    const f = {};
    columns.forEach((c) => {
      if (c.computed) return;
      f[c.key] = row[c.key] ?? (c.type === 'checkbox' ? false : '');
    });
    setForm(f);
    setModal(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form };
      columns.forEach((c) => {
        if (c.computed) return;
        if (['number', 'money', 'percent'].includes(c.type)) {
          payload[c.key] = payload[c.key] === '' ? null : Number(payload[c.key]);
        }
        if (c.type === 'date' && payload[c.key] === '') payload[c.key] = null;
      });
      if (editing) await api.put(`${endpoint}/${editing.id}`, payload);
      else await api.post(endpoint, payload);
      toast.success(t('common.saved'));
      setModal(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(t('common.confirmDelete'))) return;
    try {
      await api.delete(`${endpoint}/${row.id}`);
      toast.success(t('common.deleted'));
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Delete failed');
    }
  };

  const exportCsv = () => {
    const head = columns.map((c) => c.label).join(',');
    const body = filtered
      .map((r) => columns.map((c) => `"${String(r[c.key] ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([head + '\n' + body], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${endpoint.replace('/', '')}.csv`;
    a.click();
  };

  const renderCell = (row, c) => {
    const v = row[c.key];
    if (c.type === 'money')
      return money(convert(Number(v) || 0, displayCurrency, rates), displayCurrency, i18n.language);
    if (c.type === 'percent') return pct(v);
    if (c.type === 'number') return v == null || v === '' ? '—' : num(v);
    if (c.type === 'date') return fmtDate(v, i18n.language);
    if (c.type === 'checkbox')
      return (
        <span className={`pill ${v ? 'pill-green' : 'pill-critical'}`}>{v ? '✓' : '✗'}</span>
      );
    if (c.pill && v) return <span className={statusPill[v] || 'pill pill-yellow'}>{v}</span>;
    return v ?? '—';
  };

  // money columns get a footer total
  const totals = useMemo(() => {
    const out = {};
    columns.forEach((c) => {
      if (c.type === 'money')
        out[c.key] = filtered.reduce((a, r) => a + (Number(r[c.key]) || 0), 0);
    });
    return out;
  }, [filtered, columns]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <FiSearch className="absolute top-1/2 -translate-y-1/2 ltr:left-3 rtl:right-3 text-slate-400" />
          <input
            className="input ltr:pl-9 rtl:pr-9"
            placeholder={t('common.search')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <span className="text-sm text-slate-500">
          {filtered.length} {t('common.rows')}
        </span>
        <div className="ltr:ml-auto rtl:mr-auto flex gap-2">
          <button className="btn-ghost" onClick={exportCsv}>
            <FiDownload /> CSV
          </button>
          {canWrite && (
            <button className="btn-primary" onClick={openAdd}>
              <FiPlus /> {t('common.add')}
            </button>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className="th">
                    {c.label}
                  </th>
                ))}
                <th className="th text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td className="td text-center py-10 text-slate-400" colSpan={columns.length + 1}>
                    {t('common.loading')}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td className="td text-center py-10 text-slate-400" colSpan={columns.length + 1}>
                    {t('common.noData')}
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-brand-50/40">
                    {columns.map((c) => (
                      <td key={c.key} className="td">
                        {renderCell(row, c)}
                      </td>
                    ))}
                    <td className="td">
                      <div className="flex justify-end gap-1">
                        {canWrite && (
                          <button
                            className="p-1.5 rounded-md text-slate-500 hover:bg-brand-100 hover:text-brand-700"
                            onClick={() => openEdit(row)}
                          >
                            <FiEdit2 />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            className="p-1.5 rounded-md text-slate-500 hover:bg-red-100 hover:text-red-600"
                            onClick={() => remove(row)}
                          >
                            <FiTrash2 />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filtered.length > 0 && Object.keys(totals).length > 0 && (
              <tfoot className="bg-slate-50 font-semibold">
                <tr>
                  {columns.map((c, i) => (
                    <td key={c.key} className="td">
                      {i === 0
                        ? t('common.total')
                        : totals[c.key] != null
                          ? money(
                              convert(totals[c.key], displayCurrency, rates),
                              displayCurrency,
                              i18n.language
                            )
                          : ''}
                    </td>
                  ))}
                  <td className="td" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <Modal
        open={modal}
        wide
        title={editing ? t('common.edit') : t('common.add')}
        onClose={() => setModal(false)}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setModal(false)}>
              {t('common.cancel')}
            </button>
            <button className="btn-primary" onClick={save} disabled={saving}>
              {saving ? '…' : t('common.save')}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {columns
            .filter((c) => !c.computed)
            .map((c) => (
              <div key={c.key} className={c.type === 'checkbox' ? 'flex items-center gap-2 pt-5' : ''}>
                {c.type === 'checkbox' ? (
                  <>
                    <input
                      type="checkbox"
                      id={c.key}
                      checked={!!form[c.key]}
                      onChange={(e) => setForm({ ...form, [c.key]: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <label htmlFor={c.key} className="text-sm font-semibold text-slate-600">
                      {c.label}
                    </label>
                  </>
                ) : (
                  <>
                    <label className="label">{c.label}</label>
                    {c.type === 'select' ? (
                      <select
                        className="input"
                        value={form[c.key] ?? ''}
                        onChange={(e) => setForm({ ...form, [c.key]: e.target.value })}
                      >
                        <option value="">—</option>
                        {c.options.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="input"
                        type={
                          c.type === 'date'
                            ? 'date'
                            : ['number', 'money', 'percent'].includes(c.type)
                              ? 'number'
                              : 'text'
                        }
                        step={c.type === 'percent' ? '0.01' : 'any'}
                        value={form[c.key] ?? ''}
                        onChange={(e) => setForm({ ...form, [c.key]: e.target.value })}
                      />
                    )}
                  </>
                )}
              </div>
            ))}
        </div>
      </Modal>
    </div>
  );
}
