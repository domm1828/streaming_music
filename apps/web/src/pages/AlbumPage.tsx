import { Link, useParams } from 'react-router';
import { useAlbum } from '../features/catalog/catalog-queries';
import { TrackList } from '../features/catalog/TrackList';
import { Button } from '../components/ui';
import { usePlayerStore } from '../features/player/player-store';

export function AlbumPage() {
  const { id = '' } = useParams();
  const { data, isLoading, isError } = useAlbum(id);
  const { playQueue } = usePlayerStore.getState();

  if (isLoading) return <p className="opacity-60">Cargando…</p>;
  if (isError || !data) return <p className="text-red-500">Álbum no encontrado.</p>;

  const tracks = data.tracks ?? [];

  return (
    <div className="space-y-8">
      <header className="flex items-end gap-6">
        <div className="h-40 w-40 rounded-2xl bg-gradient-to-br from-brand-secondary to-brand-accent" />
        <div>
          <h1 className="text-4xl font-bold">{data.name}</h1>
          <p className="mt-1 opacity-70">
            {data.artists.map((a, i) => (
              <span key={a._id}>
                {i > 0 && ', '}
                <Link to={`/artist/${a._id}`} className="hover:underline">
                  {a.name}
                </Link>
              </span>
            ))}
          </p>
          <div className="mt-4 w-40">
            <Button type="button" onClick={() => playQueue(tracks, 0)} disabled={!tracks.length}>
              ▶ Reproducir
            </Button>
          </div>
        </div>
      </header>

      <TrackList tracks={tracks} />
    </div>
  );
}
