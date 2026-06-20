import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FiAlertTriangle,
  FiDownloadCloud,
  FiUploadCloud,
  FiLink,
  FiShield,
  FiZap,
} from 'react-icons/fi';
import api from '../api/client.js';
import { fmtDate } from '../utils/format.js';

const sevStyle = {
  critical: { ring: 'border-l-red-500', pill: 'pill pill-critical', label: 'Critical' },
  high: { ring: 'border-l-orange-500', pill: 'pill pill-red', label: 'High' },
  medium: { ring: 'border-l-amber-500', pill: 'pill pill-yellow', label: 'Medium' },
};
const typeIcon = {
  cash_shortfall: FiAlertTriangle,
  overdue_collection: FiDownloadCloud,
  upcoming_payment: FiUploadCloud,
  collection_dependency: FiLink,
  reserve_gap: FiShield,
};

export default function ActionCenter() {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api.get('/analytics/action-center').then((r) => setData(r.data)).catch(() => {});
  }, []);

  if (!data) return <div className="text-slate-400 py-10 text-center">{t('common.loading')}</div>;

  const actions = data.actions.filter((a) => filter === 'all' || a.severity === filter);

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500 flex items-center gap-2">
        <FiZap className="text-amber-500" />
        The system continuously scans cash position, collections and payments, and tells management
        what needs attention — ranked by urgency.
      </p>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { k: 'all', n: data.summary.total, c: 'bg-brand-500', l: 'All Actions' },
          { k: 'critical', n: data.summary.critical, c: 'bg-red-500', l: 'Critical' },
          { k: 'high', n: data.summary.high, c: 'bg-orange-500', l: 'High' },
          { k: 'medium', n: data.summary.medium, c: 'bg-amber-500', l: 'Medium' },
        ].map((x) => (
          <button
            key={x.k}
            onClick={() => setFilter(x.k)}
            className={`card p-4 text-left transition ${filter === x.k ? 'ring-2 ring-brand-400' : ''}`}
          >
            <div className={`w-9 h-9 rounded-lg ${x.c} text-white grid place-items-center font-bold mb-2`}>
              {x.n}
            </div>
            <div className="text-xs font-semibold text-slate-500">{x.l}</div>
          </button>
        ))}
      </div>

      {/* Action list */}
      <div className="space-y-3">
        {actions.length === 0 ? (
          <div className="card p-10 text-center text-slate-400">No actions in this category. 🎉</div>
        ) : (
          actions.map((a, i) => {
            const s = sevStyle[a.severity];
            const Icon = typeIcon[a.type] || FiAlertTriangle;
            return (
              <div key={i} className={`card p-4 border-l-4 ${s.ring} flex gap-4`}>
                <div className="w-10 h-10 rounded-lg bg-slate-100 grid place-items-center text-slate-600 shrink-0">
                  <Icon />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-ink">{a.title}</span>
                    <span className={s.pill}>{s.label}</span>
                    {a.date && <span className="text-xs text-slate-400">{fmtDate(a.date, i18n.language)}</span>}
                  </div>
                  <p className="text-sm text-slate-600 mt-0.5">{a.detail}</p>
                  <p className="text-sm mt-1.5">
                    <span className="font-semibold text-brand-600">→ Action: </span>
                    {a.recommendation}
                    {a.owner && <span className="text-slate-400"> · Owner: {a.owner}</span>}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
