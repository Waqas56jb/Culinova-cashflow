import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { money, statusPill } from '../utils/format.js';
import api from '../api/client.js';

const Bar = ({ value, tone = 'brand' }) => {
  const c = value >= 70 ? 'bg-emerald-500' : value >= 40 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2 min-w-[90px]">
      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full ${c}`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-600 w-9 text-right">{value}%</span>
    </div>
  );
};

export default function ControlTower() {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/analytics/projects360').then((r) => setData(r.data)).catch(() => {});
  }, []);

  if (!data) return <div className="text-slate-400 py-10 text-center">{t('common.loading')}</div>;
  const m = (v) => money(v, 'SAR', i18n.language);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Live status of all active projects — collection, procurement, delivery and installation
        progress, receivables and supplier commitments in one view.
      </p>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Project</th>
                <th className="th text-right">Contract</th>
                <th className="th">Collection</th>
                <th className="th">Procurement</th>
                <th className="th">Delivery</th>
                <th className="th">Installation</th>
                <th className="th text-right">Remaining AR</th>
                <th className="th text-right">Supplier Commit.</th>
                <th className="th text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.projects.map((r) => (
                <tr key={r.name} className="hover:bg-brand-50/40">
                  <td className="td font-semibold max-w-[200px] truncate">{r.name}</td>
                  <td className="td text-right">{m(r.contract_value)}</td>
                  <td className="td"><Bar value={r.collection_pct} /></td>
                  <td className="td"><Bar value={r.procurement_pct} /></td>
                  <td className="td"><Bar value={r.delivery_pct} /></td>
                  <td className="td"><Bar value={r.installation_pct} /></td>
                  <td className="td text-right font-semibold">{m(r.remaining_ar)}</td>
                  <td className="td text-right text-orange-600">{m(r.supplier_commitments)}</td>
                  <td className="td text-center">
                    <span className={statusPill[r.status] || 'pill pill-yellow'}>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-slate-400">
        Delivery & installation progress are derived from project status. Supplier commitments are
        linked via the payment “Project Link” field.
      </p>
    </div>
  );
}
