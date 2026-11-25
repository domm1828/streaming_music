import { Link, useParams } from 'react-router';
import { useAlbum } from '../features/catalog/catalog-queries';
import { TrackList } from '../features/catalog/TrackList';
import { MediaHeader, PlayButton } from '../components/media';
import { usePlayerStore } from '../features/player/player-store';
import { LikeButton } from '../features/social/LikeButton';
import { ShareButton } from '../features/social/ShareButton';

export function AlbumPage() {
  const { id = '' } = useParams();
  const { data, isLoading, isError } = useAlbum(id);
  const { playQueue } = usePlayerStore.getState();

  if (isLoading) return <p className="text-muted">Cargando…</p>;
  if (isError || !data) return <p className="text-red-500">Álbum no encontrado.</p>;

  const tracks = data.tracks ?? [];
  const year = data.releaseDate ? new Date(data.releaseDate).getFullYear() : null;

  return (
    <div className="space-y-8 pt-2">
      <MediaHeader
        image={data.image}
        gradient="from-brand-secondary to-brand-accent"
        kicker="Álbum"
        title={data.name}
        meta={
          <span>
            {data.artists.map((a, i) => (
              <span key={a._id}>
                {i > 0 && ', '}
                <Link to={`/artist/${a._id}`} className="font-medium text-main hover:underline">
                  {a.name}
                </Link>
              </span>
            ))}
            {year && ` · ${year}`} · {tracks.length} pistas
          </span>
        }
        actions={
          <>
            <PlayButton onClick={() => playQueue(tracks, 0)} disabled={!tracks.length} />
            <LikeButton type="album" id={data._id} label />
            <ShareButton path={`/album/${data._id}`} title={data.name} embedPath={`/embed/album/${data._id}`} />
          </>
        }
      />

      <TrackList tracks={tracks} />
    </div>
  );
}
