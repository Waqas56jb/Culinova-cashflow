import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { FiShield } from 'react-icons/fi';
import api from '../api/client.js';
import { useApp } from '../context/AppContext.jsx';
import { money, pct, convert } from '../utils/format.js';
import KpiCard from '../components/KpiCard.jsx';

export default function Reserve() {
  const { t, i18n } = useTranslation();
  const { user, displayCurrency, rates } = useApp();
  const [cfg, setCfg] = useState(null);
  const [calc, setCalc] = useState(null);
  const canEdit = ['admin', 'cfo'].includes(user?.role);

  const load = () => {
    Promise.all([api.get('/settings/reserve'), api.get('/analytics/overview')]).then(([a, b]) => {
      setCfg(a.data);
      setCalc(b.data.reserve);
    });
  };
  useEffect(load, []);

  const save = async () => {
    try {
      await api.put('/settings/reserve', {
        current_balance: Number(cfg.current_balance) || 0,
        target_reserve: Number(cfg.target_reserve) || 0,
        reserve_pct: Number(cfg.reserve_pct) || 0,
        min_operating_cash: Number(cfg.min_operating_cash) || 0,
      });
      toast.success(t('common.saved'));
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Save failed');
    }
  };

  if (!cfg || !calc) return <div className="text-slate-400 py-10 text-center">{t('common.loading')}</div>;
  const m = (v) => money(convert(Number(v) || 0, displayCurrency, rates), displayCurrency, i18n.language);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard icon={FiShield} tone="slate" label={t('kpi.reserveBalance')} value={m(calc.current_balance)} />
        <KpiCard icon={FiShield} tone="amber" label={t('kpi.reserveGap')} value={m(calc.reserve_gap)} />
        <KpiCard icon={FiShield} tone="green" label="Suggested transfer (this week)" value={m(calc.suggested_transfer_this_week)} />
      </div>

      <div className="card p-6 max-w-xl">
        <h3 className="font-bold text-ink mb-4">Reserve Fund Policy</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Current Reserve Balance" v={cfg.current_balance} onChange={(x) => setCfg({ ...cfg, current_balance: x })} disabled={!canEdit} />
          <Field label="Target Reserve" v={cfg.target_reserve} onChange={(x) => setCfg({ ...cfg, target_reserve: x })} disabled={!canEdit} />
          <Field label="Reserve % From Each Collection" v={cfg.reserve_pct} step="0.01" onChange={(x) => setCfg({ ...cfg, reserve_pct: x })} disabled={!canEdit} hint={pct(cfg.reserve_pct)} />
          <Field label="Min Operating Cash After Transfer" v={cfg.min_operating_cash} onChange={(x) => setCfg({ ...cfg, min_operating_cash: x })} disabled={!canEdit} />
        </div>
        {canEdit && (
          <button className="btn-primary mt-5" onClick={save}>
            {t('common.save')}
          </button>
        )}
      </div>
    </div>
  );
}

const Field = ({ label, v, onChange, disabled, step, hint }) => (
  <div>
    <label className="label">
      {label} {hint && <span className="text-brand-500">· {hint}</span>}
    </label>
    <input
      className="input"
      type="number"
      step={step || 'any'}
      value={v ?? ''}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);
