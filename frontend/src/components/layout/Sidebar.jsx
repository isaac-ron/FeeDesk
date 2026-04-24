import { NavLink } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useActiveTerm } from '../../context/TermContext';

// Grouped navigation matching the overhaul spec. Each group has a label and
// a list of items. Platform (super_admin) console uses its own flat list.
const SCHOOL_NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', icon: 'dashboard', label: 'Overview' },
    ],
  },
  {
    label: 'Finances',
    items: [
      { to: '/finance', icon: 'payments', label: 'Payments' },
      { to: '/finance/suspense', icon: 'help', label: 'Suspense' },
      { to: '/fees', icon: 'receipt_long', label: 'Fee structures' },
      { to: '/terms', icon: 'event', label: 'Terms' },
      { to: '/reports', icon: 'analytics', label: 'Reports' },
    ],
  },
  {
    label: 'Students',
    items: [
      { to: '/students', icon: 'school', label: 'Students' },
      { to: '/sms', icon: 'sms', label: 'SMS reminders' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { to: '/staff', icon: 'group', label: 'Staff' },
      { to: '/audit-logs', icon: 'history', label: 'Audit log' },
      { to: '/settings', icon: 'settings', label: 'Settings' },
    ],
  },
];

const PLATFORM_NAV = [
  { to: '/admin/dashboard', icon: 'monitoring', label: 'Platform' },
  { to: '/admin/schools', icon: 'apartment', label: 'Schools' },
  { to: '/admin/settings', icon: 'tune', label: 'Settings' },
];

const NavItem = ({ to, icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      // Left accent bar in the brand colour when active, per the spec.
      `relative flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all group ${
        isActive
          ? 'bg-primary/10 text-primary font-bold before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-6 before:w-1 before:bg-primary before:rounded-r-full'
          : 'text-text-muted hover:bg-slate-50 hover:text-primary'
      }`
    }
  >
    <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">
      {icon}
    </span>
    <span className="text-sm font-semibold">{label}</span>
  </NavLink>
);

const Sidebar = ({ open, onClose }) => {
  const { user, logout } = useContext(AuthContext);
  const { activeTerm } = useActiveTerm();
  const isSuperAdmin = user?.role === 'super_admin';
  const consoleLabel = isSuperAdmin ? 'Platform Console' : 'Admin Console';

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  // School name surfaces from the user's populated school field; the auth
  // endpoint already returns it. Falls back gracefully if unavailable.
  const schoolName = user?.school?.name || user?.schoolName || null;

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-surface-border
          flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)]
          transform transition-transform duration-200
          ${open ? 'translate-x-0' : '-translate-x-full'}
          lg:static lg:translate-x-0 lg:flex-shrink-0
        `}
      >
        <div className="p-6 flex-1 overflow-y-auto">
          {/* Brand */}
          <div className="flex items-center gap-3 mb-6">
            <img
              src="/feedesk-brand/feedesk-brand/logos/svg/feedesk-icon-only.svg"
              alt="FeeDesk"
              className="size-10 flex-shrink-0"
            />
            <div className="flex flex-col min-w-0">
              <h1 className="text-lg font-semibold leading-tight tracking-tight font-display truncate text-text-main">
                Fee<span className="text-primary">Desk</span>
              </h1>
              <p className="text-text-muted text-xs font-medium truncate">
                {schoolName || consoleLabel}
              </p>
            </div>
          </div>

          {/* Active term pill — visible for school users only */}
          {!isSuperAdmin && activeTerm && (
            <div className="mb-6 px-3 py-2.5 rounded-xl bg-primary/5 border border-primary/10">
              <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Active term</p>
              <p className="text-sm text-primary font-bold font-display mt-0.5 truncate">
                {activeTerm.name}
              </p>
            </div>
          )}

          {/* Grouped nav */}
          {isSuperAdmin ? (
            <nav className="flex flex-col gap-1">
              {PLATFORM_NAV.map(item => <NavItem key={item.to} {...item} />)}
            </nav>
          ) : (
            <nav className="flex flex-col gap-6">
              {SCHOOL_NAV_GROUPS.map(group => (
                <div key={group.label} className="flex flex-col gap-1">
                  <p className="px-4 text-[10px] text-text-muted uppercase tracking-wider font-bold mb-1">
                    {group.label}
                  </p>
                  {group.items.map(item => <NavItem key={item.to} {...item} />)}
                </div>
              ))}
            </nav>
          )}
        </div>

        {/* User footer */}
        <div className="p-6 border-t border-surface-border">
          <div
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer"
            onClick={logout}
          >
            <div className="size-10 rounded-full bg-slate-100 flex items-center justify-center text-primary font-bold border border-slate-200 text-sm">
              {initials}
            </div>
            <div className="flex-1 flex flex-col min-w-0">
              <p className="text-text-main text-sm font-bold font-display truncate">{user?.name || 'User'}</p>
              <p className="text-text-muted text-xs capitalize">{user?.role?.replace('_', ' ') || ''}</p>
            </div>
            <span
              className="material-symbols-outlined text-[18px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity"
              title="Sign out"
            >
              logout
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
