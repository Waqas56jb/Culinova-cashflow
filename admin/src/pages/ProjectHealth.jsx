import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/client.js';

const bandColor = { good: '#10b981', warn: '#f59e0b', risk: '#ef4444' };
const bandRing = { good: 'text-emerald-500', warn: 'text-amber-500', risk: 'text-red-500' };

function Donut({ value, band }) {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const off = circ - (value / 100) * circ;
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" className="shrink-0">
      <circle cx="44" cy="44" r={r} fill="none" stroke="#eef2f7" strokeWidth="8" />
      <circle
        cx="44" cy="44" r={r} fill="none" stroke={bandColor[band]} strokeWidth="8"
        strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
        transform="rotate(-90 44 44)"
      />
      <text x="44" y="49" textAnchor="middle" className="fill-ink" fontSize="20" fontWeight="800">
        {value}
      </text>
    </svg>
  );
}

const CompRow = ({ label, score, band }) => (
  <div className="flex items-center gap-2">
    <span className="text-xs text-slate-500 w-24">{label}</span>
    <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
      <div className="h-full" style={{ width: `${score}%`, background: bandColor[band] }} />
    </div>
    <span className="text-xs font-semibold w-8 text-right">{score}</span>
  </div>
);

export default function ProjectHealth() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/analytics/projects360').then((r) => setData(r.data)).catch(() => {});
  }, []);

  if (!data) return <div className="text-slate-400 py-10 text-center">{t('common.loading')}</div>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Overall health score (0–100) per project — every component is calculated from the project's
        actual data.
      </p>

      <details className="card p-4 text-sm">
        <summary className="font-semibold text-ink cursor-pointer">How is the Health Score calculated?</summary>
        <div className="mt-3 space-y-1.5 text-slate-600">
          <div><b>Collections %</b> = Collected ÷ Contract Value × 100</div>
          <div><b>Procurement %</b> = Linked Supplier Commitments ÷ Budget Cost × 100&nbsp;
            <span className="text-slate-400">(Budget Cost = Contract × (1 − Target GP%))</span></div>
          <div><b>Delivery %</b> = Project Progress % (entered per project; otherwise estimated from collection &amp; procurement progress)</div>
          <div><b>Profitability %</b> = (Revenue − Cost) ÷ Revenue × 100&nbsp;
            <span className="text-slate-400">(actual gross margin; 50 = neutral when no cost linked)</span></div>
          <div className="pt-2 border-t border-slate-100 font-semibold text-ink">
            Health Score = Collections×30% + Profitability×30% + Delivery×20% + Procurement×20%
          </div>
        </div>
      </details>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {data.projects
          .slice()
          .sort((a, b) => a.health.overall - b.health.overall)
          .map((r) => (
            <div key={r.name} className="card p-5">
              <div className="flex items-center gap-4">
                <Donut value={r.health.overall} band={r.health.band} />
                <div className="min-w-0">
                  <div className="font-bold text-ink truncate">{r.name}</div>
                  <div className={`text-sm font-semibold ${bandRing[r.health.band]}`}>
                    {r.health.band === 'good' ? 'Healthy' : r.health.band === 'warn' ? 'Needs attention' : 'At risk'}
                  </div>
                  <div className="text-xs text-slate-400">{r.status}</div>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <CompRow label="Collections" score={r.health.collections.score} band={r.health.collections.band} />
                <CompRow label="Procurement" score={r.health.procurement.score} band={r.health.procurement.band} />
                <CompRow label="Delivery" score={r.health.delivery.score} band={r.health.delivery.band} />
                <CompRow label="Profitability" score={r.health.profitability.score} band={r.health.profitability.band} />
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
