import { Link, NavLink, useNavigate } from 'react-router';
import { Compass, Home, Library, ListMusic, Plus, Radio, Search, Shield } from 'lucide-react';
import { useAuth } from '../auth/use-auth';
import { useCreatePlaylist, useMyPlaylists } from '../playlists/playlist-queries';

function navClass({ isActive }: { isActive: boolean }) {
  return `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-main/10 text-main' : 'text-muted hover:text-main hover:bg-main/5'
  }`;
}

export function Sidebar() {
  const { isAuthenticated, hasPermission } = useAuth();
  const navigate = useNavigate();
  const myPlaylists = useMyPlaylists();
  const createPlaylist = useCreatePlaylist();

  const onCreate = () => {
    createPlaylist.mutate(
      { name: 'Nueva playlist' },
      { onSuccess: (pl) => navigate(`/playlist/${pl._id}`) },
    );
  };

  return (
    <aside className="hidden w-64 shrink-0 flex-col gap-2 p-2 md:flex">
      <div className="rounded-panel bg-elevated p-3">
        <Link to="/" className="mb-4 flex items-center gap-2 px-2 py-1 text-lg font-bold">
          <span className="text-brand-primary">Stream</span>
          <span className="text-brand-accent">Music</span>
        </Link>
        <nav className="space-y-1">
          <NavLink to="/" end className={navClass}>
            <Home size={18} /> Inicio
          </NavLink>
          <NavLink to="/search" className={navClass}>
            <Search size={18} /> Buscar
          </NavLink>
          <NavLink to="/browse" className={navClass}>
            <Compass size={18} /> Explorar
          </NavLink>
          <NavLink to="/radio" className={navClass}>
            <Radio size={18} /> Radio
          </NavLink>
          {isAuthenticated && (
            <NavLink to="/library" className={navClass}>
              <Library size={18} /> Tu biblioteca
            </NavLink>
          )}
          {hasPermission('content.manage') && (
            <NavLink to="/admin" className={navClass}>
              <Shield size={18} /> Admin
            </NavLink>
          )}
        </nav>
      </div>

      {isAuthenticated && (
        <div className="flex min-h-0 flex-1 flex-col rounded-panel bg-elevated p-3">
          <div className="mb-2 flex items-center justify-between px-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Playlists</span>
            <button
              type="button"
              onClick={onCreate}
              disabled={createPlaylist.isPending}
              className="rounded-md p-1 text-muted hover:bg-main/10 hover:text-main"
              aria-label="Crear playlist"
            >
              <Plus size={16} />
            </button>
          </div>
          <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
            {myPlaylists.data?.data.map((pl) => (
              <li key={pl._id}>
                <NavLink
                  to={`/playlist/${pl._id}`}
                  className={({ isActive }) =>
                    `flex items-center gap-2 truncate rounded-md px-2 py-1.5 text-sm transition ${
                      isActive ? 'bg-main/10 text-main' : 'text-muted hover:text-main hover:bg-main/5'
                    }`
                  }
                >
                  <ListMusic size={15} className="shrink-0" />
                  <span className="truncate">{pl.name}</span>
                </NavLink>
              </li>
            ))}
            {myPlaylists.data && myPlaylists.data.data.length === 0 && (
              <li className="px-2 py-1 text-xs text-muted">Todavía no tenés playlists.</li>
            )}
          </ul>
        </div>
      )}
    </aside>
  );
}
