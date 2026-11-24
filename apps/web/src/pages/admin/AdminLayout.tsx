import { NavLink, Outlet } from 'react-router';

const LINKS = [
  { to: '/admin/analytics', label: 'Analytics' },
  { to: '/admin/users', label: 'Usuarios' },
  { to: '/admin/roles', label: 'Roles' },
  { to: '/admin/catalog', label: 'Catálogo' },
  { to: '/admin/import', label: 'Importar' },
  { to: '/admin/settings', label: 'Ajustes' },
  { to: '/admin/menus', label: 'Menús' },
  { to: '/admin/moderation', label: 'Moderación' },
  { to: '/admin/backstage', label: 'Backstage' },
  { to: '/admin/pages', label: 'Páginas' },
  { to: '/admin/files', label: 'Archivos' },
  { to: '/admin/logs', label: 'Logs' },
];

export function AdminLayout() {
  return (
    <div className="flex flex-col gap-6 pt-2 md:flex-row">
      <aside className="shrink-0 md:w-52">
        <h1 className="mb-4 px-3 text-lg font-bold">Administración</h1>
        <nav className="flex gap-1 overflow-x-auto md:flex-col">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-main/10 text-main' : 'text-muted hover:bg-main/5 hover:text-main'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
