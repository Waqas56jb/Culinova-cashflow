import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiCheckCircle, FiAlertTriangle, FiPauseCircle } from 'react-icons/fi';
import { money } from '../utils/format.js';
import api from '../api/client.js';

const cfg = {
  READY: { icon: FiCheckCircle, color: 'border-l-emerald-500', pill: 'pill pill-green', label: 'Ready to Procure' },
  CAUTION: { icon: FiAlertTriangle, color: 'border-l-amber-500', pill: 'pill pill-yellow', label: 'Procure with Caution' },
  HOLD: { icon: FiPauseCircle, color: 'border-l-red-500', pill: 'pill pill-critical', label: 'Hold / Wait for Collection' },
};
const order = { READY: 0, CAUTION: 1, HOLD: 2 };

export default function ProcurementReadiness() {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/analytics/projects360').then((r) => setData(r.data)).catch(() => {});
  }, []);

  if (!data) return <div className="text-slate-400 py-10 text-center">{t('common.loading')}</div>;
  const m = (v) => money(v, 'SAR', i18n.language);

  const counts = data.projects.reduce((a, r) => ((a[r.readiness] = (a[r.readiness] || 0) + 1), a), {});

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">
        Procurement recommendation per project, based on outstanding supplier commitments vs expected
        collections.
      </p>
      <div className="grid grid-cols-3 gap-3">
        {['READY', 'CAUTION', 'HOLD'].map((k) => (
          <div key={k} className="card p-4 text-center">
            <div className={`text-2xl font-extrabold ${k === 'READY' ? 'text-emerald-600' : k === 'CAUTION' ? 'text-amber-600' : 'text-red-600'}`}>
              {counts[k] || 0}
            </div>
            <div className="text-xs font-semibold text-slate-500">{cfg[k].label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {data.projects
          .slice()
          .sort((a, b) => order[b.readiness] - order[a.readiness])
          .map((r) => {
            const c = cfg[r.readiness];
            return (
              <div key={r.name} className={`card p-4 border-l-4 ${c.color} flex gap-4`}>
                <c.icon size={26} className="shrink-0 mt-1 text-slate-500" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-ink">{r.name}</span>
                    <span className={c.pill}>{c.label}</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{r.readiness_reason}</p>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-xs text-slate-500">
                    <span>Outstanding commitments: <b className="text-orange-600">{m(r.outstanding_commitments)}</b></span>
                    <span>Remaining receivables: <b className="text-emerald-600">{m(r.remaining_ar)}</b></span>
                    <span>Cash impact if procured: <b className="text-red-600">{m(r.cash_impact)}</b></span>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
