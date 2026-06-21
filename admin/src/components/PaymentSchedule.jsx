import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiCalendar, FiPlus, FiTrash2 } from 'react-icons/fi';
import api from '../api/client.js';
import { money } from '../utils/format.js';
import Modal from './Modal.jsx';

const VAT_RATES = [
  { label: '0%', value: 0 },
  { label: '5%', value: 0.05 },
  { label: '10%', value: 0.1 },
  { label: '15%', value: 0.15 },
];
const PCT = (label, percent) => ({ label, percent, amount: '', due_date: '' });
const AMT = (label, amount) => ({ label, percent: '', amount, due_date: '' });

// Split a supplier purchase into installments — by PERCENTAGE (of a total) or
// by fixed AMOUNT (e.g. 3000 now, 4000 in 2 weeks, 3000 in 1 month). Each
// installment is generated as its own cash-flow payment entry on save.
export default function PaymentSchedule({ onSaved }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('amount'); // 'amount' | 'percent'
  const [opts, setOpts] = useState({ suppliers: [], projects: [] });
  const [busy, setBusy] = useState(false);
  const [head, setHead] = useState({
    supplier: '',
    category: 'Supplier Payment',
    project_link: '',
    total: '',
    vat_rate: 0,
  });
  const [rows, setRows] = useState([AMT('1st Payment', ''), AMT('2nd Payment', ''), AMT('3rd Payment', '')]);

  useEffect(() => {
    if (open) api.get('/options').then((r) => setOpts(r.data)).catch(() => {});
  }, [open]);

  const total = Number(head.total) || 0;
  const sumPct = rows.reduce((a, r) => a + (Number(r.percent) || 0), 0);
  const sumAmt = rows.reduce((a, r) => a + (Number(r.amount) || 0), 0);
  const amountOf = (r) =>
    mode === 'percent' ? Math.round(total * (Number(r.percent) || 0)) / 100 : Number(r.amount) || 0;

  const setRow = (i, patch) => setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () => setRows([...rows, mode === 'percent' ? PCT('Installment', 0) : AMT('Installment', '')]);
  const delRow = (i) => setRows(rows.filter((_, idx) => idx !== i));

  const switchMode = (m) => {
    setMode(m);
    setRows(m === 'percent'
      ? [PCT('Advance Payment', 30), PCT('Final Payment', 70)]
      : [AMT('1st Payment', ''), AMT('2nd Payment', ''), AMT('3rd Payment', '')]);
  };

  const generate = async () => {
    if (!head.supplier) return toast.warn('Select or type a supplier');
    if (mode === 'percent') {
      if (!total) return toast.warn('Enter the total amount');
      if (Math.round(sumPct) !== 100) return toast.warn(`Installments must total 100% (now ${sumPct}%)`);
    } else if (sumAmt <= 0) {
      return toast.warn('Enter installment amounts');
    }
    if (rows.some((r) => !r.due_date)) return toast.warn('Every installment needs a due date');

    setBusy(true);
    try {
      for (const r of rows) {
        const amt = amountOf(r);
        if (amt <= 0) continue;
        const note =
          mode === 'percent'
            ? `${r.label} (${r.percent}% of ${total.toLocaleString()})`
            : `${r.label} (installment ${rows.indexOf(r) + 1}/${rows.length})`;
        await api.post('/payments', {
          category: head.category,
          supplier: head.supplier,
          project_link: head.project_link || null,
          amount: amt,
          vat_rate: Number(head.vat_rate) || 0,
          due_date: r.due_date,
          notes: note,
          paid: false,
        });
      }
      toast.success(`${rows.filter((r) => amountOf(r) > 0).length} payment installments generated`);
      setOpen(false);
      onSaved?.();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to generate');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button className="btn-ghost" onClick={() => setOpen(true)}>
        <FiCalendar /> Split / Schedule Payments
      </button>

      <Modal
        open={open}
        wide
        title="Split Payment into Installments"
        onClose={() => setOpen(false)}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={generate} disabled={busy}>
              {busy ? 'Generating…' : `Generate ${rows.length} payments`}
            </button>
          </>
        }
      >
        {/* mode toggle */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => switchMode('amount')} className={mode === 'amount' ? 'btn-primary !py-1.5' : 'btn-ghost !py-1.5'}>
            By Amount
          </button>
          <button onClick={() => switchMode('percent')} className={mode === 'percent' ? 'btn-primary !py-1.5' : 'btn-ghost !py-1.5'}>
            By Percentage
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="label">Supplier</label>
            <input
              className="input"
              list="ps-suppliers"
              value={head.supplier}
              onChange={(e) => setHead({ ...head, supplier: e.target.value })}
              placeholder="Select or type a new supplier…"
            />
            <datalist id="ps-suppliers">
              {opts.suppliers.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="label">Project Link</label>
            <select className="input" value={head.project_link} onChange={(e) => setHead({ ...head, project_link: e.target.value })}>
              <option value="">— none —</option>
              {opts.projects.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          {mode === 'percent' && (
            <div>
              <label className="label">Total Amount (excl. VAT)</label>
              <input className="input" type="number" value={head.total} onChange={(e) => setHead({ ...head, total: e.target.value })} placeholder="e.g. 100000" />
            </div>
          )}
          <div>
            <label className="label">VAT Rate</label>
            <select className="input" value={head.vat_rate} onChange={(e) => setHead({ ...head, vat_rate: Number(e.target.value) })}>
              {VAT_RATES.map((v) => (
                <option key={v.value} value={v.value}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-ink">Installments</span>
          {mode === 'percent' ? (
            <span className={`text-sm font-semibold ${Math.round(sumPct) === 100 ? 'text-emerald-600' : 'text-red-600'}`}>
              Total: {sumPct}%
            </span>
          ) : (
            <span className="text-sm font-semibold text-emerald-600">Total: {money(sumAmt, 'SAR')}</span>
          )}
        </div>

        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-4">
                <label className="label">Label</label>
                <input className="input !py-1.5" value={r.label} onChange={(e) => setRow(i, { label: e.target.value })} />
              </div>
              {mode === 'percent' ? (
                <>
                  <div className="col-span-2">
                    <label className="label">%</label>
                    <input className="input !py-1.5" type="number" value={r.percent} onChange={(e) => setRow(i, { percent: e.target.value })} />
                  </div>
                  <div className="col-span-3">
                    <label className="label">Amount</label>
                    <input className="input !py-1.5 bg-slate-50" value={money(amountOf(r), 'SAR')} disabled readOnly />
                  </div>
                </>
              ) : (
                <div className="col-span-5">
                  <label className="label">Amount (excl. VAT)</label>
                  <input className="input !py-1.5" type="number" value={r.amount} onChange={(e) => setRow(i, { amount: e.target.value })} placeholder="e.g. 3000" />
                </div>
              )}
              <div className="col-span-2">
                <label className="label">Due Date</label>
                <input className="input !py-1.5" type="date" value={r.due_date} onChange={(e) => setRow(i, { due_date: e.target.value })} />
              </div>
              <div className="col-span-1">
                <button className="btn-danger !p-2 w-full" onClick={() => delRow(i)} disabled={rows.length <= 1}>
                  <FiTrash2 />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button className="btn-ghost mt-3" onClick={addRow}>
          <FiPlus /> Add installment
        </button>
      </Modal>
    </>
  );
}
