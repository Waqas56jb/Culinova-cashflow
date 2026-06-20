import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/client.js';
import { useApp } from '../context/AppContext.jsx';
import { money, fmtDate, convert, statusPill } from '../utils/format.js';

export default function Forecast() {
  const { t, i18n } = useTranslation();
  const { displayCurrency, rates } = useApp();
  const [weeks, setWeeks] = useState([]);
  const [n, setN] = useState(13);
  const [loading, setLoading] = useState(true);

  const load = (count) => {
    setLoading(true);
    api
      .get(`/analytics/forecast?weeks=${count}`)
      .then((r) => setWeeks(r.data.weeks))
      .finally(() => setLoading(false));
  };
  useEffect(() => load(n), [n]);

  const m = (v) => money(convert(Number(v) || 0, displayCurrency, rates), displayCurrency, i18n.language);
  const cols = ['Opening', 'Inflows', 'Outflows', 'Net', 'Reserve', 'Closing'];
  const keys = ['opening', 'inflows', 'outflows', 'net', 'reserve_transfer', 'closing'];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-slate-600">Weeks:</span>
        {[13, 26, 52].map((w) => (
          <button
            key={w}
            onClick={() => setN(w)}
            className={n === w ? 'btn-primary !py-1.5' : 'btn-ghost !py-1.5'}
          >
            {w}
          </button>
        ))}
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Week</th>
                {cols.map((c) => (
                  <th key={c} className="th text-right">
                    {c}
                  </th>
                ))}
                <th className="th text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td className="td text-center py-10 text-slate-400" colSpan={8}>{t('common.loading')}</td></tr>
              ) : (
                weeks.map((w) => (
                  <tr key={w.index} className="hover:bg-brand-50/40">
                    <td className="td font-semibold">{fmtDate(w.week_start, i18n.language)}</td>
                    {keys.map((k) => (
                      <td
                        key={k}
                        className={`td text-right ${w[k] < 0 ? 'text-red-600 font-semibold' : ''}`}
                      >
                        {m(w[k])}
                      </td>
                    ))}
                    <td className="td text-center">
                      <span className={statusPill[w.status]}>{w.status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
