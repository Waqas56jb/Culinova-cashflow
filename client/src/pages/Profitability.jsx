import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { money, pct } from '../utils/format.js';
import api from '../api/client.js';

export default function Profitability() {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/analytics/projects360').then((r) => setData(r.data)).catch(() => {});
  }, []);

  if (!data) return <div className="text-slate-400 py-10 text-center">{t('common.loading')}</div>;
  const m = (v) => money(v, 'SAR', i18n.language);
  const cols = [
    ['Project', 'name'],
    ['Revenue (Contract)', 'contract_value', 'm'],
    ['Budget Cost', 'budget_cost', 'm'],
    ['Cost (Actual)', 'actual_cost', 'm'],
    ['Expected GP', 'expected_gp', 'm'],
    ['Gross Profit (Rev − Cost)', 'actual_gp', 'm'],
    ['GP %', 'actual_gp_pct', 'p'],
  ];

  const tt = data.totals;
  const Tile = ({ label, value, tone = 'text-ink' }) => (
    <div className="card p-4">
      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</div>
      <div className={`text-lg font-extrabold ${tone}`}>{value}</div>
    </div>
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Profitability per project. <b>GP = Contract Value − Project Costs</b> (only supplier payments
        linked to the project; company overhead is excluded). <b>GP % = GP ÷ Contract Value.</b>
      </p>

      {/* Company profit summary */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <Tile label="Total Contract" value={m(tt.contract_value)} />
        <Tile label="Project Costs (excl. VAT)" value={m(tt.total_direct_cost)} tone="text-orange-600" />
        <Tile label="Gross Profit" value={m(tt.gross_profit)} tone="text-emerald-600" />
        <Tile label="Overhead (OPEX)" value={m(tt.overhead_opex)} tone="text-orange-600" />
        <Tile label="Net Profit" value={m(tt.net_profit)} tone={tt.net_profit < 0 ? 'text-red-600' : 'text-emerald-700'} />
        <Tile label="VAT (tracked)" value={m(tt.vat_total)} tone="text-slate-600" />
      </div>
      <p className="text-xs text-slate-400">
        Profitability uses NET amounts (excluding VAT); VAT is tracked separately for tax reporting.
        Net Profit = Gross Profit − Overhead (Salaries, Rent, Government Fees, Other Expenses,
        Commissions). Project Costs include direct supplier/logistics/installation payments only.
      </p>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                {cols.map((c) => (
                  <th key={c[0]} className={`th ${c[2] ? 'text-right' : ''}`}>{c[0]}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.projects.map((r) => (
                <tr key={r.name} className="hover:bg-brand-50/40">
                  <td className="td font-semibold">{r.name}</td>
                  <td className="td text-right">{m(r.contract_value)}</td>
                  <td className="td text-right text-slate-500">{m(r.budget_cost)}</td>
                  <td className="td text-right">{m(r.actual_cost)}</td>
                  <td className="td text-right text-emerald-600">{m(r.expected_gp)}</td>
                  <td className={`td text-right font-semibold ${r.actual_gp < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                    {m(r.actual_gp)}
                  </td>
                  <td className="td text-right">
                    <span className={`pill ${r.actual_gp_pct >= r.gp_pct ? 'pill-green' : r.actual_gp_pct >= r.gp_pct * 0.5 ? 'pill-yellow' : 'pill-critical'}`}>
                      {pct(r.actual_gp_pct)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-bold">
              <tr>
                <td className="td">Total</td>
                <td className="td text-right">{m(data.totals.contract_value)}</td>
                <td className="td" />
                <td className="td text-right">{m(data.totals.actual_cost)}</td>
                <td className="td text-right text-emerald-700">{m(data.totals.expected_gp)}</td>
                <td className="td" />
                <td className="td" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
