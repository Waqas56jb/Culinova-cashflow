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

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Profitability per project. <b>Gross Profit = Revenue − Cost</b> and{' '}
        <b>GP % = Gross Profit ÷ Revenue</b>, where Revenue = Contract Value and Cost = supplier
        payments linked to the project.
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
