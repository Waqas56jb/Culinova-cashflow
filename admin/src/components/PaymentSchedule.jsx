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
const blankRow = (label, percent) => ({ label, percent, due_date: '' });

// Enter a total supplier amount once, define % installments + due dates,
// and generate the matching payment (cash-flow) entries on save.
export default function PaymentSchedule({ onSaved }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState({ suppliers: [], projects: [] });
  const [busy, setBusy] = useState(false);
  const [head, setHead] = useState({
    supplier: '',
    category: 'Supplier Payment',
    project_link: '',
    total: '',
    vat_rate: 0,
  });
  const [rows, setRows] = useState([blankRow('Advance Payment', 30), blankRow('Final Payment', 70)]);

  useEffect(() => {
    if (open) api.get('/options').then((r) => setOpts(r.data)).catch(() => {});
  }, [open]);

  const total = Number(head.total) || 0;
  const sumPct = rows.reduce((a, r) => a + (Number(r.percent) || 0), 0);
  const amountOf = (r) => Math.round(total * (Number(r.percent) || 0)) / 100;

  const setRow = (i, patch) => setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () => setRows([...rows, blankRow('Installment', 0)]);
  const delRow = (i) => setRows(rows.filter((_, idx) => idx !== i));

  const generate = async () => {
    if (!head.supplier) return toast.warn('Select a supplier');
    if (!total) return toast.warn('Enter the total amount');
    if (Math.round(sumPct) !== 100) return toast.warn(`Installments must total 100% (now ${sumPct}%)`);
    if (rows.some((r) => !r.due_date)) return toast.warn('Every installment needs a due date');

    setBusy(true);
    try {
      for (const r of rows) {
        await api.post('/payments', {
          category: head.category,
          supplier: head.supplier,
          project_link: head.project_link || null,
          amount: amountOf(r),
          vat_rate: Number(head.vat_rate) || 0,
          due_date: r.due_date,
          notes: `${r.label} (${r.percent}% of ${total.toLocaleString()})`,
          paid: false,
        });
      }
      toast.success(`${rows.length} payment installments generated`);
      setOpen(false);
      setHead({ supplier: '', category: 'Supplier Payment', project_link: '', total: '', vat_rate: 0 });
      setRows([blankRow('Advance Payment', 30), blankRow('Final Payment', 70)]);
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
        <FiCalendar /> Payment Schedule
      </button>

      <Modal
        open={open}
        wide
        title="Supplier Payment Schedule"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="label">Supplier</label>
            <select className="input" value={head.supplier} onChange={(e) => setHead({ ...head, supplier: e.target.value })}>
              <option value="">— select —</option>
              {opts.suppliers.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
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
          <div>
            <label className="label">Total Supplier Amount (excl. VAT)</label>
            <input className="input" type="number" value={head.total} onChange={(e) => setHead({ ...head, total: e.target.value })} placeholder="e.g. 100000" />
          </div>
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
          <span className={`text-sm font-semibold ${Math.round(sumPct) === 100 ? 'text-emerald-600' : 'text-red-600'}`}>
            Total: {sumPct}%
          </span>
        </div>

        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-4">
                <label className="label">Label</label>
                <input className="input !py-1.5" value={r.label} onChange={(e) => setRow(i, { label: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="label">%</label>
                <input className="input !py-1.5" type="number" value={r.percent} onChange={(e) => setRow(i, { percent: e.target.value })} />
              </div>
              <div className="col-span-3">
                <label className="label">Amount</label>
                <input className="input !py-1.5 bg-slate-50" value={money(amountOf(r), 'SAR')} disabled readOnly />
              </div>
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
