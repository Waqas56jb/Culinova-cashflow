import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { money, num } from '../utils/format.js';
import api from '../api/client.js';

export default function MonthlyForecast() {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState(null);
  const [months, setMonths] = useState(6);

  useEffect(() => {
    api.get(`/analytics/monthly-forecast?months=${months}`).then((r) => setData(r.data)).catch(() => {});
  }, [months]);

  if (!data) return <div className="text-slate-400 py-10 text-center">{t('common.loading')}</div>;
  const m = (v) => money(v, 'SAR', i18n.language);
  const chart = data.months.map((x) => ({
    month: x.month,
    Revenue: Math.round(x.revenue),
    'Gross Profit': Math.round(x.gross_profit),
    OPEX: Math.round(x.opex),
    'Net Profit': Math.round(x.net_profit),
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-slate-500">
          Forecast revenue, gross profit, operating expenses and net profit by month. Blended GP ={' '}
          {(data.blended_gp_pct * 100).toFixed(0)}%.
        </p>
        <div className="flex gap-2">
          {[6, 9, 12].map((n) => (
            <button key={n} onClick={() => setMonths(n)} className={months === n ? 'btn-primary !py-1.5' : 'btn-ghost !py-1.5'}>
              {n} mo
            </button>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chart}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => num(v / 1000) + 'k'} />
            <Tooltip formatter={(v) => m(v)} />
            <Legend />
            <ReferenceLine y={0} stroke="#94a3b8" />
            <Bar dataKey="Revenue" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
            <Bar dataKey="OPEX" fill="#f97316" radius={[4, 4, 0, 0]} />
            <Line type="monotone" dataKey="Net Profit" stroke="#10b981" strokeWidth={2.5} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Month</th>
                <th className="th text-right">Revenue Forecast</th>
                <th className="th text-right">Gross Profit</th>
                <th className="th text-right">OPEX</th>
                <th className="th text-right">Net Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.months.map((x) => (
                <tr key={x.month} className="hover:bg-brand-50/40">
                  <td className="td font-semibold">{x.month}</td>
                  <td className="td text-right">{m(x.revenue)}</td>
                  <td className="td text-right text-emerald-600">{m(x.gross_profit)}</td>
                  <td className="td text-right text-orange-600">{m(x.opex)}</td>
                  <td className={`td text-right font-bold ${x.net_profit < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                    {m(x.net_profit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
