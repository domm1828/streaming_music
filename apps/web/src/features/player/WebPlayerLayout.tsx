import { Link, Outlet } from 'react-router';
import { useAuth } from '../auth/use-auth';
import { PlayerBar } from './PlayerBar';
import { PlayerEngine } from './PlayerEngine';

export function WebPlayerLayout() {
  const { isAuthenticated, user, hasPermission } = useAuth();

  return (
    <div className="min-h-full pb-24">
      <header className="sticky top-0 z-30 border-b border-brand-secondary/20 bg-[color:var(--surface)]/90 backdrop-blur">
        <nav className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <Link to="/" className="text-lg font-bold">
            <span className="text-brand-primary">Stream</span>
            <span className="text-brand-accent">Music</span>
          </Link>
          <Link to="/browse" className="text-sm opacity-80 hover:opacity-100">
            Explorar
          </Link>
          <Link to="/search" className="text-sm opacity-80 hover:opacity-100">
            Buscar
          </Link>
          {isAuthenticated && (
            <Link to="/library" className="text-sm opacity-80 hover:opacity-100">
              Tu biblioteca
            </Link>
          )}
          {hasPermission('content.manage') && (
            <Link to="/admin/import" className="text-sm opacity-80 hover:opacity-100">
              Importar
            </Link>
          )}
          <div className="ml-auto flex items-center gap-3 text-sm">
            {isAuthenticated ? (
              <>
                {user && (
                  <Link to={`/u/${user.username}`} className="opacity-80 hover:opacity-100">
                    Perfil
                  </Link>
                )}
                <Link to="/account" className="rounded-lg bg-brand-primary px-3 py-1.5 font-medium text-white">
                  {user?.name}
                </Link>
              </>
            ) : (
              <Link to="/login" className="font-medium text-brand-secondary hover:underline">
                Iniciar sesión
              </Link>
            )}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>

      <PlayerBar />
      <PlayerEngine />
    </div>
  );
}
