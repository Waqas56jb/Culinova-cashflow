import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import api from '../api/client.js';
import { useApp } from '../context/AppContext.jsx';

export default function Settings() {
  const { t } = useTranslation();
  const { user } = useApp();
  const [s, setS] = useState(null);
  const [rates, setRates] = useState([]);
  const canEdit = ['admin', 'cfo'].includes(user?.role);

  const load = () => {
    api.get('/settings/company').then((r) => setS(r.data));
    api.get('/settings/rates').then((r) => setRates(r.data));
  };
  useEffect(load, []);

  const saveCompany = async () => {
    try {
      await api.put('/settings/company', {
        company_name: s.company_name,
        base_currency: s.base_currency,
        current_bank_balance: Number(s.current_bank_balance) || 0,
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

  const saveRate = async (currency, rate) => {
    try {
      await api.put(`/settings/rates/${currency}`, { rate_to_sar: Number(rate) || 0 });
      toast.success(`${currency} updated`);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
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
          <F label="Base Currency" k="base_currency" />
          <F label="Current Bank Balance" k="current_bank_balance" type="number" step="any" />
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

      <div className="card p-6">
        <h3 className="font-bold text-ink mb-4">Exchange Rates (1 unit = ? SAR)</h3>
        <div className="space-y-2">
          {rates.map((r, i) => (
            <div key={r.currency} className="flex items-center gap-3">
              <span className="w-14 font-bold">{r.currency}</span>
              <input
                className="input flex-1"
                type="number"
                step="0.0001"
                defaultValue={r.rate_to_sar}
                disabled={!canEdit}
                onChange={(e) => {
                  const copy = [...rates];
                  copy[i] = { ...r, rate_to_sar: e.target.value };
                  setRates(copy);
                }}
              />
              {canEdit && (
                <button className="btn-ghost" onClick={() => saveRate(r.currency, rates[i].rate_to_sar)}>
                  {t('common.save')}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
