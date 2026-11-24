import { Link, useParams } from 'react-router';
import { useTrack } from '../features/catalog/catalog-queries';
import { Button } from '../components/ui';
import { usePlayerStore } from '../features/player/player-store';
import { LikeButton } from '../features/social/LikeButton';
import { AddToPlaylist } from '../features/playlists/AddToPlaylist';
import { TrackList } from '../features/catalog/TrackList';
import { useSimilarTracks } from '../features/discovery/discovery-queries';

export function TrackPage() {
  const { id = '' } = useParams();
  const { data, isLoading, isError } = useTrack(id);
  const similar = useSimilarTracks(id);
  const { playTrack } = usePlayerStore.getState();

  if (isLoading) return <p className="opacity-60">Cargando…</p>;
  if (isError || !data) return <p className="text-red-500">Pista no encontrada.</p>;

  return (
    <div className="space-y-6">
      <header className="flex items-end gap-6">
        <div className="h-40 w-40 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-accent" />
        <div>
          <p className="text-sm uppercase tracking-wide opacity-60">Pista</p>
          <h1 className="text-4xl font-bold">{data.name}</h1>
          <p className="mt-1 opacity-70">
            {data.artists?.map((a, i) => (
              <span key={a.artist._id}>
                {i > 0 && ', '}
                <Link to={`/artist/${a.artist._id}`} className="hover:underline">
                  {a.artist.name}
                </Link>
              </span>
            ))}
            {data.album && (
              <>
                {' · '}
                <Link to={`/album/${data.album._id}`} className="hover:underline">
                  {data.album.name}
                </Link>
              </>
            )}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="w-40">
              <Button type="button" onClick={() => playTrack(data)}>
                ▶ Reproducir
              </Button>
            </div>
            <LikeButton type="track" id={data._id} label />
            <AddToPlaylist trackId={data._id} />
            <Link
              to={`/radio?seedType=track&seedId=${data._id}`}
              className="rounded-lg border border-brand-secondary/30 px-3 py-2 text-sm font-medium hover:border-brand-secondary/60"
            >
              📻 Radio
            </Link>
          </div>
        </div>
      </header>

      {data.lyric ? (
        <section className="rounded-2xl border border-brand-secondary/20 bg-brand-primary/5 p-6">
          <h2 className="mb-3 text-lg font-semibold">Letra</h2>
          <pre className="whitespace-pre-wrap font-sans text-sm opacity-80">{data.lyric.text}</pre>
        </section>
      ) : (
        <p className="opacity-60">Esta pista no tiene letra.</p>
      )}

      {similar.data && similar.data.data.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Similares</h2>
          <TrackList tracks={similar.data.data} />
        </section>
      )}
    </div>
  );
}
