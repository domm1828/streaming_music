import { NavLink, Outlet } from 'react-router';

const LINKS = [
  { to: '/admin/users', label: 'Usuarios' },
  { to: '/admin/catalog', label: 'Catálogo' },
  { to: '/admin/import', label: 'Importar' },
];

export function AdminLayout() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Administración</h1>
      <nav className="flex flex-wrap gap-2 border-b border-brand-secondary/20 pb-2">
        {LINKS.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `rounded-full px-4 py-1.5 text-sm font-medium transition ${
                isActive ? 'bg-brand-primary text-white' : 'hover:bg-brand-primary/10'
              }`
            }
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
