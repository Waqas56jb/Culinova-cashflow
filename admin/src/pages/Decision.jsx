import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { FiShoppingCart, FiCheckCircle, FiAlertTriangle, FiXCircle, FiClock } from 'react-icons/fi';
import api from '../api/client.js';
import { useApp } from '../context/AppContext.jsx';
import { money, num, fmtDate, convert } from '../utils/format.js';

const decisionStyle = {
  SAFE: { color: '#10b981', icon: FiCheckCircle, label: 'Safe to Proceed' },
  CAUTION: { color: '#f59e0b', icon: FiAlertTriangle, label: 'Proceed with Caution' },
  DELAY: { color: '#f97316', icon: FiClock, label: 'Delay Recommended' },
  AVOID: { color: '#ef4444', icon: FiXCircle, label: 'Avoid / Do Not Issue' },
};

export default function Decision() {
  const { i18n } = useTranslation();
  const { displayCurrency, rates } = useApp();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);

  const m = (v) => money(convert(Number(v) || 0, displayCurrency, rates), displayCurrency, i18n.language);

  const run = async (e) => {
    e.preventDefault();
    if (!amount || !date) return toast.warn('Enter amount and date');
    setBusy(true);
    try {
      const { data } = await api.post('/analytics/simulate', {
        amount: Number(amount),
        due_date: date,
      });
      setRes(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Simulation failed');
    } finally {
      setBusy(false);
    }
  };

  const chartData = res
    ? res.weeks_before.map((w, i) => ({
        week: fmtDate(w.week_start, i18n.language),
        'Without PO': Math.round(convert(w.closing, displayCurrency, rates)),
        'With PO': Math.round(convert(res.weeks_after[i].closing, displayCurrency, rates)),
      }))
    : [];

  const ds = res ? decisionStyle[res.decision] : null;

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">
        Before issuing a purchase order, simulate its impact on cash. The system tells you whether
        it’s safe, and if not, when to issue it instead.
      </p>

      <form onSubmit={run} className="card p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
        <div>
          <label className="label">Purchase Amount (SAR)</label>
          <input
            className="input"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 150000"
          />
        </div>
        <div>
          <label className="label">Planned Payment Date</label>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <button className="btn-primary h-[42px]" disabled={busy}>
          <FiShoppingCart /> {busy ? 'Analyzing…' : 'Analyze Cash Impact'}
        </button>
      </form>

      {res && (
        <>
          {/* Decision banner */}
          <div
            className="rounded-2xl p-5 text-white flex items-center gap-4"
            style={{ background: `linear-gradient(135deg, ${ds.color}, #0b1733)` }}
          >
            <ds.icon size={40} />
            <div className="flex-1">
              <div className="text-sm opacity-80 uppercase tracking-wide">Recommendation</div>
              <div className="text-2xl font-extrabold">{ds.label}</div>
              <div className="text-sm opacity-90 mt-1">{res.reason}</div>
            </div>
          </div>

          {/* Impact metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Metric label="Lowest cash WITHOUT this PO" value={m(res.min_closing_before)} />
            <Metric
              label="Lowest cash WITH this PO"
              value={m(res.min_closing_after)}
              danger={res.min_closing_after < 0}
            />
            <Metric
              label="Earliest safe date to issue"
              value={res.recommended_earliest_date ? fmtDate(res.recommended_earliest_date, i18n.language) : 'Not within horizon'}
            />
          </div>

          {res.worst_week && (
            <div className="card p-4 text-sm">
              <span className="font-semibold">Tightest week if you proceed: </span>
              {fmtDate(res.worst_week.week_start, i18n.language)} — closing{' '}
              <span className={res.worst_week.closing < 0 ? 'text-red-600 font-bold' : 'font-bold'}>
                {m(res.worst_week.closing)}
              </span>{' '}
              ({res.worst_week.status})
            </div>
          )}

          {/* Before vs After chart */}
          <div className="card p-5">
            <h3 className="font-bold text-ink mb-4">Cash Position — With vs Without this Purchase</h3>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => num(v / 1000) + 'k'} />
                <Tooltip formatter={(v) => m(v)} />
                <Legend />
                <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" />
                <Line type="monotone" dataKey="Without PO" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="With PO" stroke="#ef4444" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

const Metric = ({ label, value, danger }) => (
  <div className="card p-5">
    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</div>
    <div className={`text-2xl font-extrabold ${danger ? 'text-red-600' : 'text-ink'}`}>{value}</div>
  </div>
);
