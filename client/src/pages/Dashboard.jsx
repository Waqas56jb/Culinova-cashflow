import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  FiDollarSign,
  FiDownload,
  FiUpload,
  FiActivity,
  FiShield,
  FiAlertTriangle,
  FiTrendingDown,
} from 'react-icons/fi';
import api from '../api/client.js';
import { useApp } from '../context/AppContext.jsx';
import { money, num, fmtDate, convert } from '../utils/format.js';
import KpiCard from '../components/KpiCard.jsx';

const CommitTile = ({ label, value, tone }) => (
  <div className="rounded-xl border border-slate-100 p-4">
    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</div>
    <div className={`text-xl font-extrabold ${tone}`}>{value}</div>
  </div>
);

const statusTone = { Green: 'green', Yellow: 'amber', Red: 'red', Critical: 'red' };
const statusColor = { Green: '#10b981', Yellow: '#f59e0b', Red: '#f97316', Critical: '#ef4444' };

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const { displayCurrency, rates } = useApp();
  const [data, setData] = useState(null);
  const [commit, setCommit] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/analytics/overview')
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
    api.get('/analytics/commitments').then((r) => setCommit(r.data)).catch(() => {});
  }, []);

  if (loading) return <div className="text-slate-400 py-20 text-center">{t('common.loading')}</div>;
  if (!data) return <div className="text-red-500 py-20 text-center">Failed to load analytics.</div>;

  const { dashboard: d, forecast, reserve, scenarios } = data;
  const c = (v) => convert(Number(v) || 0, displayCurrency, rates);
  const m = (v) => money(c(v), displayCurrency, i18n.language);

  const chartData = forecast.weeks.map((w) => ({
    week: fmtDate(w.week_start, i18n.language),
    Opening: Math.round(c(w.opening)),
    Inflows: Math.round(c(w.inflows)),
    Outflows: Math.round(c(w.outflows)),
    Net: Math.round(c(w.net)),
    Closing: Math.round(c(w.closing)),
  }));

  const alerts = [];
  if (d.net_cash_position_30d < d.thresholds.red)
    alerts.push({ t: 'Low cash: Net 30-day position is below the critical threshold.', tone: 'red' });
  if (d.min_closing_13w < 0)
    alerts.push({ t: `Forecast goes negative — critical week: ${fmtDate(d.critical_week, i18n.language)}.`, tone: 'red' });
  if (d.reserve_gap > 0)
    alerts.push({ t: `Reserve gap of ${m(d.reserve_gap)} vs target.`, tone: 'amber' });

  return (
    <div className="space-y-6">
      {/* Cash status banner */}
      <div
        className="rounded-2xl p-5 text-white flex flex-wrap items-center justify-between gap-4"
        style={{ background: `linear-gradient(135deg, ${statusColor[d.cash_status]}, #0b1733)` }}
      >
        <div>
          <div className="text-sm/none opacity-80 uppercase tracking-wide">{t('kpi.cashStatus')}</div>
          <div className="text-3xl font-extrabold mt-1">
            {d.cash_status} · {t(`status.${d.cash_status}`)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm opacity-80">{t('kpi.netCash')}</div>
          <div className="text-3xl font-extrabold">{m(d.net_cash_position_30d)}</div>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard icon={FiDollarSign} tone="brand" label={t('kpi.bankBalance')} value={m(d.current_bank_balance)} />
        <KpiCard icon={FiDownload} tone="green" label={t('kpi.collections30')} value={m(d.expected_collections_30d)} />
        <KpiCard icon={FiUpload} tone="red" label={t('kpi.payments30')} value={m(d.expected_payments_30d)} />
        <KpiCard icon={FiActivity} tone={statusTone[d.cash_status]} label={t('kpi.netCash')} value={m(d.net_cash_position_30d)} />
        <KpiCard icon={FiShield} tone="slate" label={t('kpi.reserveBalance')} value={m(d.reserve_fund_balance)} sub={`${t('kpi.targetReserve')}: ${m(d.target_reserve)}`} />
        <KpiCard icon={FiShield} tone="amber" label={t('kpi.reserveGap')} value={m(d.reserve_gap)} />
        <KpiCard icon={FiTrendingDown} tone="red" label={t('kpi.minClosing')} value={m(d.min_closing_13w)} />
        <KpiCard icon={FiAlertTriangle} tone="slate" label={t('kpi.criticalWeek')} value={fmtDate(d.critical_week, i18n.language)} />
      </div>

      {/* Available vs Committed cash */}
      {commit && (
        <div className="card p-5">
          <h3 className="font-bold text-ink mb-4">Available Cash vs Committed Cash</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <CommitTile label="Available (Bank)" value={m(commit.available_cash)} tone="text-emerald-600" />
            <CommitTile label="Committed (unpaid)" value={m(commit.committed_total)} tone="text-orange-600" />
            <CommitTile
              label="Free to Spend"
              value={m(commit.free_to_spend)}
              tone={commit.free_to_spend < 0 ? 'text-red-600' : 'text-emerald-600'}
            />
            <CommitTile
              label="Reserve to Keep"
              value={m(commit.min_operating_cash)}
              tone="text-slate-600"
            />
          </div>
          {commit.free_to_spend < 0 && (
            <div className="mt-3 text-sm bg-red-50 text-red-700 rounded-lg px-3 py-2">
              ⚠️ Commitments exceed available cash after reserve — avoid new purchases until collections arrive.
            </div>
          )}
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="card p-4 space-y-2">
          <div className="font-bold text-ink flex items-center gap-2">
            <FiAlertTriangle className="text-amber-500" /> Alerts & Notifications
          </div>
          {alerts.map((a, i) => (
            <div
              key={i}
              className={`text-sm rounded-lg px-3 py-2 ${a.tone === 'red' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}
            >
              {a.t}
            </div>
          ))}
        </div>
      )}

      {/* Closing balance area chart */}
      <div className="card p-5">
        <h3 className="font-bold text-ink mb-4">{t('charts.closingBalance')}</h3>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={chartData} margin={{ left: 4, right: 8 }}>
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1e3a8a" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
            <XAxis dataKey="week" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => num(v / 1000) + 'k'} />
            <Tooltip formatter={(v) => m(v)} />
            <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" />
            <Area type="monotone" dataKey="Closing" stroke="#1e3a8a" strokeWidth={2.5} fill="url(#g)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Weekly cash flow */}
        <div className="card p-5">
          <h3 className="font-bold text-ink mb-4">{t('charts.weeklyFlow')}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="week" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => num(v / 1000) + 'k'} />
              <Tooltip formatter={(v) => m(v)} />
              <Legend />
              <Bar dataKey="Inflows" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Outflows" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Scenario comparison */}
        <div className="card p-5">
          <h3 className="font-bold text-ink mb-4">{t('charts.scenarioCompare')}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={scenarios.map((s) => ({ name: s.name, Projected: Math.round(c(s.projected_cash)) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => num(v / 1000) + 'k'} />
              <Tooltip formatter={(v) => m(v)} />
              <ReferenceLine y={0} stroke="#94a3b8" />
              <Bar dataKey="Projected" radius={[4, 4, 0, 0]}>
                {scenarios.map((s, i) => (
                  <Cell key={i} fill={statusColor[s.status]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Net cash line */}
      <div className="card p-5">
        <h3 className="font-bold text-ink mb-4">{t('charts.cashTrend')}</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
            <XAxis dataKey="week" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => num(v / 1000) + 'k'} />
            <Tooltip formatter={(v) => m(v)} />
            <Legend />
            <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="Opening" stroke="#64748b" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Net" stroke="#1e3a8a" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Closing" stroke="#10b981" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
