import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Scissors, ClipboardList, Factory, Shirt, FileSpreadsheet,
  Users, Activity, LogOut, Menu, X, FileText,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/issues', label: 'Issues', icon: Scissors },
  { to: '/production', label: 'Daily Production', icon: ClipboardList },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/activity', label: 'Activity Log', icon: Activity },
  { section: 'Master data', roles: ['admin', 'manager'] },
  { to: '/plants', label: 'Plants', icon: Factory, roles: ['admin', 'manager'] },
  { to: '/styles', label: 'Styles', icon: Shirt, roles: ['admin', 'manager'] },
  { to: '/job-sheets', label: 'Job Sheets', icon: FileSpreadsheet, roles: ['admin', 'manager'] },
  { section: 'Administration', roles: ['admin'] },
  { to: '/users', label: 'Users', icon: Users, roles: ['admin'] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const visible = NAV.filter((item) => !item.roles || item.roles.includes(user?.role));

  const sidebar = (
    <div className="flex h-full flex-col bg-brand-900 text-slate-200">
      <div className="flex items-center gap-3 px-6 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
          <Scissors className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Garment Tracker</p>
          <p className="text-xs text-slate-400">Production control</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {visible.map((item, i) =>
          item.section ? (
            <p key={`s-${i}`} className="px-3 pb-1 pt-5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {item.section}
            </p>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          )
        )}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="mb-3 px-2">
          <p className="truncate text-sm font-medium text-white">{user?.name}</p>
          <p className="text-xs capitalize text-slate-400">{user?.role}</p>
        </div>
        <button onClick={logout} className="btn-secondary w-full border-white/10 bg-white/5 text-slate-200 hover:bg-white/10">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block">{sidebar}</aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="w-64">{sidebar}</div>
          <div className="flex-1 bg-slate-900/50" onClick={() => setOpen(false)} />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button onClick={() => setOpen((v) => !v)} className="btn-ghost p-2" aria-label="Toggle menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <span className="font-semibold">Garment Tracker</span>
        </header>

        <main key={location.pathname} className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
