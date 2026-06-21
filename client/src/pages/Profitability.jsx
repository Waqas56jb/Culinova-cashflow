import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { money } from '../utils/format.js';
import api from '../api/client.js';

const p1 = (v) => (v == null ? '—' : `${(Number(v) * 100).toFixed(1)}%`);

export default function Profitability() {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/analytics/projects360').then((r) => setData(r.data)).catch(() => {});
  }, []);

  if (!data) return <div className="text-slate-400 py-10 text-center">{t('common.loading')}</div>;
  const m = (v) => (v == null ? 'N/A' : money(v, 'SAR', i18n.language));
  const tt = data.totals;

  const Card = ({ label, value, tone = 'text-ink' }) => (
    <div className="card p-4">
      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</div>
      <div className={`text-lg font-extrabold ${tone}`}>{value}</div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Company Performance (2026 projects only) */}
      <div>
        <h3 className="font-bold text-ink mb-2">Company Performance — 2026 Projects ({tt.projects_in_pnl})</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          <Card label="Total Revenue (ex VAT)" value={m(tt.total_revenue_ex_vat)} />
          <Card label="Total Direct Cost" value={m(tt.total_direct_cost)} tone="text-orange-600" />
          <Card label="Total Gross Profit" value={m(tt.total_gross_profit)} tone="text-emerald-600" />
          <Card label="Total GP %" value={p1(tt.total_gp_pct)} />
          <Card label="OPEX Allocated To Date" value={m(tt.opex_allocated_to_date)} tone="text-orange-600" />
          <Card label="Company Net Profit" value={m(tt.company_net_profit)} tone={tt.company_net_profit < 0 ? 'text-red-600' : 'text-emerald-700'} />
          <Card label="Company Net Profit %" value={p1(tt.company_net_profit_pct)} tone={tt.company_net_profit < 0 ? 'text-red-600' : 'text-emerald-700'} />
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Annual OPEX Budget {money(tt.opex_annual_budget, 'SAR')} · Daily {money(tt.opex_daily_rate, 'SAR')} ·
          Day {tt.days_elapsed}/365 · Revenue is ex-VAT (Contract ÷ 1.15). Break-even needs{' '}
          {money(tt.annual_breakeven_gp, 'SAR')} annual GP to cover overhead.
        </p>
      </div>

      {/* Per-project profitability */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Project</th>
                <th className="th text-right">Contract (ex VAT)</th>
                <th className="th text-right">Direct Cost</th>
                <th className="th text-right">Gross Profit</th>
                <th className="th text-right">GP %</th>
                <th className="th text-right">Allocated OPEX</th>
                <th className="th text-right">Net Profit</th>
                <th className="th text-right">Net Profit %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.projects.map((r) => (
                <tr key={r.name} className={`hover:bg-brand-50/40 ${r.in_pnl ? '' : 'text-slate-400'}`}>
                  <td className="td font-semibold">
                    {r.name}
                    {r.in_pnl && <span className="ltr:ml-2 rtl:mr-2 pill pill-green">2026</span>}
                  </td>
                  <td className="td text-right">{m(r.net_revenue)}</td>
                  <td className="td text-right">{m(r.actual_cost)}</td>
                  <td className="td text-right text-emerald-700">{m(r.actual_gp)}</td>
                  <td className="td text-right">{p1(r.actual_gp_pct)}</td>
                  <td className="td text-right text-orange-600">{r.in_pnl ? m(r.allocated_opex) : 'N/A'}</td>
                  <td className={`td text-right font-semibold ${r.net_profit < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                    {r.in_pnl ? m(r.net_profit) : 'N/A'}
                  </td>
                  <td className="td text-right">{r.in_pnl ? p1(r.net_profit_pct) : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-bold">
              <tr>
                <td className="td">Company (2026)</td>
                <td className="td text-right">{m(tt.total_revenue_ex_vat)}</td>
                <td className="td text-right">{m(tt.total_direct_cost)}</td>
                <td className="td text-right text-emerald-700">{m(tt.total_gross_profit)}</td>
                <td className="td text-right">{p1(tt.total_gp_pct)}</td>
                <td className="td text-right text-orange-600">{m(tt.opex_allocated_to_date)}</td>
                <td className={`td text-right ${tt.company_net_profit < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                  {m(tt.company_net_profit)}
                </td>
                <td className="td text-right">{p1(tt.company_net_profit_pct)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      <p className="text-xs text-slate-400">
        GP = Contract (ex VAT) − Direct Cost. Net Profit = GP − Allocated OPEX Share. Only the 2026
        projects participate in OPEX allocation and company net profit; other projects show GP only.
      </p>
    </div>
  );
}
