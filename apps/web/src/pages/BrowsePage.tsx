import { useState } from 'react';
import { Link } from 'react-router';
import { useArtists } from '../features/catalog/catalog-queries';

export function BrowsePage() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useArtists(search || undefined);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Explorar artistas</h1>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar artistas…"
        className="mb-6 w-full max-w-sm rounded-lg border border-brand-secondary/40 bg-transparent px-3 py-2 outline-none focus:border-brand-secondary"
      />
      {isLoading && <p className="opacity-60">Cargando…</p>}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {data?.data.map((artist) => (
          <Link
            key={artist._id}
            to={`/artist/${artist._id}`}
            className="rounded-xl border border-brand-secondary/15 bg-brand-primary/5 p-4 transition hover:border-brand-secondary/40"
          >
            <div className="mb-3 aspect-square rounded-lg bg-gradient-to-br from-brand-primary to-brand-secondary" />
            <p className="truncate font-semibold">{artist.name}</p>
          </Link>
        ))}
      </div>
      {data && data.data.length === 0 && <p className="opacity-60">No se encontraron artistas.</p>}
    </div>
  );
}
