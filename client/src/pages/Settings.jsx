import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import api from '../api/client.js';
import { useApp } from '../context/AppContext.jsx';

export default function Settings() {
  const { t } = useTranslation();
  const { user } = useApp();
  const [s, setS] = useState(null);
  const canEdit = ['admin', 'cfo'].includes(user?.role);

  const load = () => {
    api.get('/settings/company').then((r) => setS(r.data));
  };
  useEffect(load, []);

  const saveCompany = async () => {
    try {
      await api.put('/settings/company', {
        company_name: s.company_name,
        base_currency: 'SAR',
        current_bank_balance: Number(s.current_bank_balance) || 0,
        opex_annual_budget: Number(s.opex_annual_budget) || 0,
        vat_rate: Number(s.vat_rate) || 0,
        status_green: Number(s.status_green) || 0,
        status_yellow: Number(s.status_yellow) || 0,
        status_red: Number(s.status_red) || 0,
        forecast_start_date: s.forecast_start_date,
      });
      toast.success(t('common.saved'));
    } catch (e) {
      toast.error(e.response?.data?.error || 'Save failed');
    }
  };

  if (!s) return <div className="text-slate-400 py-10 text-center">{t('common.loading')}</div>;
  const F = ({ label, k, type = 'text', step }) => (
    <div>
      <label className="label">{label}</label>
      <input
        className="input"
        type={type}
        step={step}
        value={s[k] ?? ''}
        disabled={!canEdit}
        onChange={(e) => setS({ ...s, [k]: e.target.value })}
      />
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="card p-6">
        <h3 className="font-bold text-ink mb-4">Company & Cash Settings</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <F label="Company Name" k="company_name" />
          <div>
            <label className="label">Currency</label>
            <input className="input bg-slate-50" value="SAR (Saudi Riyal)" disabled />
          </div>
          <F label="Current Bank Balance" k="current_bank_balance" type="number" step="any" />
          <F label="Annual OPEX Budget" k="opex_annual_budget" type="number" step="any" />
          <F label="VAT Rate (e.g. 0.15)" k="vat_rate" type="number" step="0.01" />
          <F label="Forecast Start Date" k="forecast_start_date" type="date" />
          <div />
          <F label="Status Green ≥" k="status_green" type="number" />
          <F label="Status Yellow ≥" k="status_yellow" type="number" />
          <F label="Status Red ≥" k="status_red" type="number" />
        </div>
        {canEdit && (
          <button className="btn-primary mt-5" onClick={saveCompany}>
            {t('common.save')}
          </button>
        )}
      </div>
    </div>
  );
}
