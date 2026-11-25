import { NavLink, Outlet } from 'react-router';

const TABS = [
  { to: '/admin/settings/general', label: 'General' },
  { to: '/admin/settings/email', label: 'Email' },
  { to: '/admin/settings/auth', label: 'Autenticación' },
  { to: '/admin/settings/appearance', label: 'Apariencia' },
  { to: '/admin/settings/localizations', label: 'Idiomas' },
  { to: '/admin/settings/menus', label: 'Menús' },
];

export function AdminSettingsLayout() {
  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold">Ajustes</h2>
      <nav className="flex flex-wrap gap-1 border-b border-divider pb-px">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              `-mb-px whitespace-nowrap rounded-t-lg border-b-2 px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? 'border-brand-secondary text-main'
                  : 'border-transparent text-muted hover:text-main'
              }`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
