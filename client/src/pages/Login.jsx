import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { FiGlobe, FiLock, FiMail } from 'react-icons/fi';
import { useApp } from '../context/AppContext.jsx';

export default function Login() {
  const { t, i18n } = useTranslation();
  const { login } = useApp();
  const nav = useNavigate();
  const [email, setEmail] = useState('admin@gmail.com');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
      nav('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between bg-brand-900 text-white p-12 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="flex items-center gap-3 relative">
          <div className="w-10 h-10 rounded-xl bg-white text-brand-900 grid place-items-center font-extrabold">
            C
          </div>
          <span className="font-extrabold text-xl">CULINOVA</span>
        </div>
        <div className="relative">
          <h2 className="text-4xl font-extrabold leading-tight">Cash Flow CFO</h2>
          <p className="mt-4 text-slate-300 max-w-md">
            Real-time visibility and control over projects, collections, payments, reserves and a
            live 13-week cash forecast.
          </p>
        </div>
        <div className="text-slate-400 text-sm relative">© {new Date().getFullYear()} CULINOVA</div>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6 bg-slate-100">
        <form onSubmit={submit} className="card w-full max-w-md p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-extrabold text-ink">{t('common.welcome')}</h1>
              <p className="text-sm text-slate-500">{t('app')}</p>
            </div>
            <button
              type="button"
              className="btn-ghost !px-3"
              onClick={() => i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar')}
            >
              <FiGlobe /> {i18n.language === 'ar' ? 'EN' : 'عربي'}
            </button>
          </div>

          <label className="label">{t('common.email')}</label>
          <div className="relative mb-4">
            <FiMail className="absolute top-1/2 -translate-y-1/2 ltr:left-3 rtl:right-3 text-slate-400" />
            <input
              className="input ltr:pl-9 rtl:pr-9"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <label className="label">{t('common.password')}</label>
          <div className="relative mb-6">
            <FiLock className="absolute top-1/2 -translate-y-1/2 ltr:left-3 rtl:right-3 text-slate-400" />
            <input
              className="input ltr:pl-9 rtl:pr-9"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button className="btn-primary w-full" disabled={busy}>
            {busy ? '…' : t('common.signIn')}
          </button>

          <p className="text-xs text-slate-400 mt-4 text-center">
            Default admin: admin@gmail.com / admin@123!
          </p>
        </form>
      </div>
    </div>
  );
}
