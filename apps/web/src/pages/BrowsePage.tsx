import { useState } from 'react';
import { Search } from 'lucide-react';
import { useArtists } from '../features/catalog/catalog-queries';
import { MediaCard, MediaGrid } from '../components/MediaCard';

export function BrowsePage() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useArtists(search || undefined);

  return (
    <div className="space-y-6 pt-2">
      <h1 className="text-3xl font-bold">Explorar artistas</h1>
      <div className="relative max-w-sm">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar artistas…"
          className="w-full rounded-full border border-divider bg-chip py-2 pl-9 pr-4 outline-none focus:border-brand-secondary"
        />
      </div>
      {isLoading && <p className="text-muted">Cargando…</p>}
      <MediaGrid>
        {data?.data.map((artist) => (
          <MediaCard
            key={artist._id}
            to={`/artist/${artist._id}`}
            title={artist.name}
            image={artist.image}
            shape="round"
          />
        ))}
      </MediaGrid>
      {data && data.data.length === 0 && <p className="text-muted">No se encontraron artistas.</p>}
    </div>
  );
}
