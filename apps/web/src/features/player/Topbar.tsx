import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Search, UserRound } from 'lucide-react';
import { useAuth } from '../auth/use-auth';
import { NotificationBell } from '../notifications/NotificationBell';

export function Topbar() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 px-2 py-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
        }}
        className="relative flex-1 md:max-w-md"
      >
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar artistas, canciones, álbumes…"
          className="w-full rounded-full border border-divider bg-chip py-2 pl-9 pr-4 text-sm outline-none focus:border-brand-secondary"
        />
      </form>

      <div className="ml-auto flex items-center gap-2">
        {isAuthenticated ? (
          <>
            <NotificationBell />
            <Link
              to="/account"
              className="flex items-center gap-2 rounded-full bg-chip py-1 pl-1 pr-3 text-sm font-medium hover:bg-main/10"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-primary text-white">
                <UserRound size={16} />
              </span>
              <span className="hidden max-w-32 truncate sm:inline">{user?.name}</span>
            </Link>
          </>
        ) : (
          <>
            <Link to="/login" className="rounded-full px-4 py-2 text-sm font-medium text-muted hover:text-main">
              Iniciar sesión
            </Link>
            <Link
              to="/register"
              className="rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:bg-brand-primary-light"
            >
              Crear cuenta
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
