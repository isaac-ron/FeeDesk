import { NavLink } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const NAV_ITEMS = [
  { to: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { to: '/students', icon: 'school', label: 'Students' },
  { to: '/finance', icon: 'payments', label: 'Finance' },
  { to: '/fees', icon: 'receipt', label: 'Fees' },
  { to: '/staff', icon: 'group', label: 'Staff' },
  { to: '/reports', icon: 'analytics', label: 'Reports' },
  { to: '/settings', icon: 'settings', label: 'Settings' },
];

const Sidebar = () => {
  const { user, logout } = useContext(AuthContext);

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <aside className="w-64 bg-white border-r border-surface-border flex-shrink-0 flex flex-col h-full z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
      <div className="p-6 flex-1 overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="size-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-white text-[22px]">account_balance</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-primary text-xl font-extrabold leading-tight tracking-tight font-display">SchoolPay</h1>
            <p className="text-text-muted text-xs font-medium">Admin Console</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                  isActive
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'text-text-muted hover:bg-slate-50 hover:text-primary'
                }`
              }
            >
              <span className="material-symbols-outlined group-hover:scale-110 transition-transform">{icon}</span>
              <span className="text-sm font-semibold">{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* User footer */}
      <div className="p-6 border-t border-surface-border">
        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer" onClick={logout}>
          <div className="size-10 rounded-full bg-slate-100 flex items-center justify-center text-primary font-bold border border-slate-200 text-sm">
            {initials}
          </div>
          <div className="flex-1 flex flex-col min-w-0">
            <p className="text-text-main text-sm font-bold font-display truncate">{user?.name || 'User'}</p>
            <p className="text-text-muted text-xs capitalize">{user?.role?.replace('_', ' ') || ''}</p>
          </div>
          <span className="material-symbols-outlined text-[18px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" title="Sign out">logout</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
