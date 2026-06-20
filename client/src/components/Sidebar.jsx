import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FiGrid,
  FiZap,
  FiShoppingCart,
  FiPieChart,
  FiColumns,
  FiHeart,
  FiCheckSquare,
  FiCalendar,
  FiTrendingUp,
  FiFolder,
  FiDownload,
  FiUpload,
  FiBox,
  FiShield,
  FiActivity,
  FiTruck,
  FiUsers,
  FiClock,
  FiSettings,
} from 'react-icons/fi';

const items = [
  { to: '/', icon: FiGrid, key: 'nav.dashboard', end: true },
  { to: '/action-center', icon: FiZap, key: 'nav.actionCenter' },
  { to: '/decision', icon: FiShoppingCart, key: 'nav.decision' },
  { to: '/profitability', icon: FiPieChart, key: 'nav.profitability' },
  { to: '/control-tower', icon: FiColumns, key: 'nav.controlTower' },
  { to: '/project-health', icon: FiHeart, key: 'nav.health' },
  { to: '/procurement-readiness', icon: FiCheckSquare, key: 'nav.procurement' },
  { to: '/monthly-forecast', icon: FiCalendar, key: 'nav.monthly' },
  { to: '/forecast', icon: FiTrendingUp, key: 'nav.forecast' },
  { to: '/projects', icon: FiFolder, key: 'nav.projects' },
  { to: '/collections', icon: FiDownload, key: 'nav.collections' },
  { to: '/payments', icon: FiUpload, key: 'nav.payments' },
  { to: '/inventory', icon: FiBox, key: 'nav.inventory' },
  { to: '/reserve', icon: FiShield, key: 'nav.reserve' },
  { to: '/scenario', icon: FiActivity, key: 'nav.scenario' },
  { to: '/supplier-ledger', icon: FiTruck, key: 'nav.supplierLedger' },
  { to: '/customer-ledger', icon: FiUsers, key: 'nav.customerLedger' },
  { to: '/ar-aging', icon: FiClock, key: 'nav.aging' },
  { to: '/settings', icon: FiSettings, key: 'nav.settings' },
];

export default function Sidebar({ open }) {
  const { t } = useTranslation();
  return (
    <aside
      className={`fixed z-30 top-0 bottom-0 w-[260px] bg-brand-900 text-slate-200 flex flex-col transition-transform duration-200
        ${open ? 'translate-x-0' : 'ltr:-translate-x-full rtl:translate-x-full'}`}
      style={{ insetInlineStart: 0 }}
    >
      <div className="h-16 flex items-center gap-3 px-5 border-b border-white/10">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-100 to-white text-brand-900 grid place-items-center font-extrabold">
          C
        </div>
        <div>
          <div className="font-extrabold text-white leading-tight">CULINOVA</div>
          <div className="text-[11px] text-slate-400 -mt-0.5">Cash Flow CFO</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
        {items.map(({ to, icon: Icon, key, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition
               ${isActive ? 'bg-white text-brand-900 shadow-sm' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`
            }
          >
            <Icon className="text-lg shrink-0" />
            <span className="truncate">{t(key)}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-5 py-3 text-[11px] text-slate-500 border-t border-white/10">
        © {new Date().getFullYear()} CULINOVA
      </div>
    </aside>
  );
}
