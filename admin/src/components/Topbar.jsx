import { useTranslation } from 'react-i18next';
import { FiMenu, FiGlobe, FiLogOut } from 'react-icons/fi';
import { useApp } from '../context/AppContext.jsx';

export default function Topbar({ onToggle, title }) {
  const { t, i18n } = useTranslation();
  const { user, logout } = useApp();

  const toggleLang = () => i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar');

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center gap-3 px-4 lg:px-6 sticky top-0 z-20">
      <button
        className="btn-ghost !p-2.5"
        onClick={onToggle}
        aria-label="Toggle sidebar"
        title="Open / close menu"
      >
        <FiMenu size={20} />
      </button>
      <h1 className="text-lg font-bold text-ink flex-1 truncate">{title}</h1>

      <div className="flex items-center gap-2">
        <span className="hidden sm:inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600">
          SAR
        </span>

        <button className="btn-ghost !px-3" onClick={toggleLang} title={t('common.language')}>
          <FiGlobe />
          <span className="font-bold">{i18n.language === 'ar' ? 'EN' : 'عربي'}</span>
        </button>

        <div className="hidden md:flex flex-col items-end leading-tight ltr:pl-2 rtl:pr-2">
          <span className="text-sm font-semibold text-ink">{user?.full_name}</span>
          <span className="text-[11px] text-slate-400 uppercase">{user?.role}</span>
        </div>
        <button className="btn-danger !px-3" onClick={logout} title={t('nav.logout')}>
          <FiLogOut />
        </button>
      </div>
    </header>
  );
}
