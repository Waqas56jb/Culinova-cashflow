import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import { RESOURCES } from '../resources.js';

const TITLES = {
  '/': 'nav.dashboard',
  '/action-center': 'nav.actionCenter',
  '/decision': 'nav.decision',
  '/profitability': 'nav.profitability',
  '/control-tower': 'nav.controlTower',
  '/project-health': 'nav.health',
  '/procurement-readiness': 'nav.procurement',
  '/monthly-forecast': 'nav.monthly',
  '/forecast': 'nav.forecast',
  '/reserve': 'nav.reserve',
  '/scenario': 'nav.scenario',
  '/settings': 'nav.settings',
};

export default function Layout() {
  // Sidebar starts open on desktop, closed on mobile.
  const [open, setOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const { t } = useTranslation();
  const { pathname } = useLocation();

  const resKey = pathname.replace('/', '');
  const titleKey = TITLES[pathname] || RESOURCES[resKey]?.titleKey || 'app';

  return (
    <div className="min-h-screen">
      <Sidebar open={open} onClose={() => setOpen(false)} />

      {/* mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setOpen(false)} />
      )}

      <div
        className={`flex flex-col min-h-screen transition-[margin] duration-200 ${
          open ? 'lg:ltr:ml-[260px] lg:rtl:mr-[260px]' : ''
        }`}
      >
        <Topbar onToggle={() => setOpen((o) => !o)} title={t(titleKey)} />
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
