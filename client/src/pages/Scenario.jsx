import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/client.js';
import { useApp } from '../context/AppContext.jsx';
import { money, pct, num, convert, statusPill } from '../utils/format.js';

export default function Scenario() {
  const { t, i18n } = useTranslation();
  const { displayCurrency, rates } = useApp();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/scenarios').then((r) => setRows(r.data)).finally(() => setLoading(false));
  }, []);

  const m = (v) => money(convert(Number(v) || 0, displayCurrency, rates), displayCurrency, i18n.language);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Stress-test the next 30 days: how does cash look if clients pay late or only partially?
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {rows.map((s) => (
          <div key={s.name} className="card p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-ink">{s.name}</h3>
              <span className={statusPill[s.status]}>{s.status}</span>
            </div>
            <p className="text-xs text-slate-400 mb-3">{s.notes}</p>
            <dl className="space-y-1.5 text-sm">
              <Row k="Reliability" v={pct(s.reliability_pct)} />
              <Row k="Delay days" v={num(s.delay_days)} />
              <Row k="Adj. collections" v={m(s.adjusted_collections_30d)} />
              <Row k="Payments" v={m(s.payments_30d)} />
              <Row k="Starting bank" v={m(s.starting_bank)} />
            </dl>
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="text-xs text-slate-500">Projected cash</div>
              <div className={`text-2xl font-extrabold ${s.projected_cash < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {m(s.projected_cash)}
              </div>
            </div>
          </div>
        ))}
      </div>
      {loading && <div className="text-center text-slate-400 py-6">{t('common.loading')}</div>}
    </div>
  );
}

const Row = ({ k, v }) => (
  <div className="flex justify-between">
    <dt className="text-slate-500">{k}</dt>
    <dd className="font-semibold text-ink">{v}</dd>
  </div>
);
