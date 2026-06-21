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
  const tableColumns = columns.filter((c) => !c.formOnly); // formOnly fields show only in the add/edit form

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm(columns));
  const [saving, setSaving] = useState(false);
  const [dynOpts, setDynOpts] = useState({});
  const [filters, setFilters] = useState({});

  const canWrite = ['admin', 'cfo', 'sales'].includes(user?.role);
  const canDelete = ['admin', 'cfo'].includes(user?.role);

  // master lists for dropdown fields / filters that use `optionsSource`
  const needsOptions =
    columns.some((c) => c.optionsSource) || (config.filters || []).some((f) => f.optionsSource);
  useEffect(() => {
    if (!needsOptions) return;
    api.get('/options').then((r) => setDynOpts(r.data)).catch(() => {});
  }, [needsOptions]);
  const colOptions = (c) => (c.optionsSource ? dynOpts[c.optionsSource] || [] : c.options);

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

  const filterDefs = config.filters || [];
  const filtered = useMemo(() => {
    let out = rows;
    if (q.trim()) {
      const s = q.toLowerCase();
      out = out.filter((r) => columns.some((c) => String(r[c.key] ?? '').toLowerCase().includes(s)));
    }
    filterDefs.forEach((f) => {
      const val = filters[f.key];
      if (f.type === 'date-range') {
        if (val?.from) out = out.filter((r) => r[f.key] && r[f.key] >= val.from);
        if (val?.to) out = out.filter((r) => r[f.key] && r[f.key] <= val.to);
      } else if (val != null && val !== '') {
        out = out.filter((r) => String(r[f.key] ?? '') === String(val));
      }
    });
    return out;
  }, [rows, q, columns, filters, filterDefs]);

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
        if (['number', 'money', 'percent', 'percent100'].includes(c.type) || c.numeric) {
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
    const head = tableColumns.map((c) => c.label).join(',');
    const body = filtered
      .map((r) => tableColumns.map((c) => `"${String(r[c.key] ?? '').replace(/"/g, '""')}"`).join(','))
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
    // Show the exact stored value (e.g. 0.2) — no rounding, no % conversion (matches Excel)
    if (c.type === 'percent') return v == null || v === '' ? '—' : `${Number(v)}`;
    // Ratio shown as a percentage (e.g. 0.3 -> 30%, 0.588 -> 58.8%)
    if (c.type === 'percent100') {
      if (v == null || v === '') return '—';
      const n = Number(v) * 100;
      return Number.isInteger(n) ? `${n}%` : `${n.toFixed(1)}%`;
    }
    if (c.type === 'number') return v == null || v === '' ? '—' : `${Number(v)}`;
    if (c.type === 'date') return fmtDate(v, i18n.language);
    if (c.type === 'checkbox')
      return (
        <span className={`pill ${v ? 'pill-green' : 'pill-critical'}`}>{v ? '✓' : '✗'}</span>
      );
    // object-option select (e.g. VAT rate 0.15 -> "15%")
    if (c.type === 'select' && c.options?.length && typeof c.options[0] === 'object') {
      const found = c.options.find((o) => String(o.value) === String(v));
      return found ? found.label : v ?? '—';
    }
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

      {filterDefs.length > 0 && (
        <div className="card p-3 flex flex-wrap items-end gap-3">
          {filterDefs.map((f) => {
            const fOpts = f.optionsSource ? dynOpts[f.optionsSource] || [] : f.options || [];
            if (f.type === 'date-range') {
              return (
                <div key={f.key}>
                  <label className="label">{f.label}</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="date"
                      className="input !py-1.5"
                      value={filters[f.key]?.from || ''}
                      onChange={(e) =>
                        setFilters({ ...filters, [f.key]: { ...filters[f.key], from: e.target.value } })
                      }
                    />
                    <span className="text-slate-400">→</span>
                    <input
                      type="date"
                      className="input !py-1.5"
                      value={filters[f.key]?.to || ''}
                      onChange={(e) =>
                        setFilters({ ...filters, [f.key]: { ...filters[f.key], to: e.target.value } })
                      }
                    />
                  </div>
                </div>
              );
            }
            return (
              <div key={f.key} className="min-w-[140px]">
                <label className="label">{f.label}</label>
                <select
                  className="input !py-1.5"
                  value={filters[f.key] ?? ''}
                  onChange={(e) => setFilters({ ...filters, [f.key]: e.target.value })}
                >
                  <option value="">All</option>
                  {fOpts.map((o) => {
                    const opt = typeof o === 'object' ? o : { label: o, value: o };
                    return (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    );
                  })}
                </select>
              </div>
            );
          })}
          {Object.keys(filters).length > 0 && (
            <button className="btn-ghost !py-1.5" onClick={() => setFilters({})}>
              Clear filters
            </button>
          )}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                {tableColumns.map((c) => (
                  <th key={c.key} className="th">
                    {c.label}
                  </th>
                ))}
                <th className="th text-right sticky ltr:right-0 rtl:left-0 bg-slate-50 shadow-[-6px_0_8px_-6px_rgba(15,23,42,0.15)]">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td className="td text-center py-10 text-slate-400" colSpan={tableColumns.length + 1}>
                    {t('common.loading')}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td className="td text-center py-10 text-slate-400" colSpan={tableColumns.length + 1}>
                    {t('common.noData')}
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-brand-50/40">
                    {tableColumns.map((c) => (
                      <td key={c.key} className="td">
                        {renderCell(row, c)}
                      </td>
                    ))}
                    <td className="td sticky ltr:right-0 rtl:left-0 bg-white shadow-[-6px_0_8px_-6px_rgba(15,23,42,0.12)]">
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
                  {tableColumns.map((c, i) => (
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
            .filter((c) => !c.computed || c.compute)
            .map((c) => {
              // Read-only, live auto-calculated field (e.g. VAT amount, Total incl. VAT)
              if (c.computed && c.compute) {
                const val = c.compute(form);
                const shown = c.type === 'money' ? money(val, displayCurrency, i18n.language) : `${val}`;
                return (
                  <div key={c.key}>
                    <label className="label">{c.label}</label>
                    <input className="input bg-slate-50 font-semibold" value={shown} disabled readOnly />
                  </div>
                );
              }
              let fieldOpts = colOptions(c) || [];
              // optionally show only options matching another field (e.g. collections of the selected project)
              if (c.filterByField) {
                const fv = form[c.filterByField];
                if (fv) fieldOpts = fieldOpts.filter((o) => typeof o === 'object' && o[c.filterKey] === fv);
              }
              const isObjOpts = c.type === 'select' && fieldOpts.length && typeof fieldOpts[0] === 'object';
              return (
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
                      {c.type === 'select' && c.allowNew ? (
                        // combobox: pick an existing value OR type a brand-new one
                        <>
                          <input
                            className="input"
                            list={`dl-${c.key}`}
                            value={form[c.key] ?? ''}
                            onChange={(e) => setForm({ ...form, [c.key]: e.target.value })}
                            placeholder="Select or type a new value…"
                          />
                          <datalist id={`dl-${c.key}`}>
                            {fieldOpts.map((o) => {
                              const opt = isObjOpts ? o : { label: o, value: o };
                              return <option key={opt.value} value={opt.value} />;
                            })}
                          </datalist>
                        </>
                      ) : c.type === 'select' ? (
                        <select
                          className="input"
                          value={form[c.key] ?? ''}
                          onChange={(e) => setForm({ ...form, [c.key]: e.target.value })}
                        >
                          <option value="">—</option>
                          {fieldOpts.map((o) => {
                            const opt = isObjOpts ? o : { label: o, value: o };
                            return (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            );
                          })}
                        </select>
                      ) : (
                        <input
                          className="input"
                          type={
                            c.type === 'date'
                              ? 'date'
                              : ['number', 'money', 'percent', 'percent100'].includes(c.type)
                                ? 'number'
                                : 'text'
                          }
                          step={c.type === 'percent' || c.type === 'percent100' ? '0.01' : 'any'}
                          value={form[c.key] ?? ''}
                          onChange={(e) => setForm({ ...form, [c.key]: e.target.value })}
                        />
                      )}
                    </>
                  )}
                </div>
              );
            })}
        </div>
      </Modal>
    </div>
  );
}
