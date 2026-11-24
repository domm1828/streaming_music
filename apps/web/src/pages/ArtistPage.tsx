import { Link, useParams } from 'react-router';
import { useArtist, useArtistAlbums, useArtistTracks } from '../features/catalog/catalog-queries';
import { TrackList } from '../features/catalog/TrackList';
import { Button } from '../components/ui';
import { usePlayerStore } from '../features/player/player-store';
import { FollowButton } from '../features/social/FollowButton';
import { LikeButton } from '../features/social/LikeButton';

export function ArtistPage() {
  const { id = '' } = useParams();
  const artist = useArtist(id);
  const tracks = useArtistTracks(id);
  const albums = useArtistAlbums(id);
  const { playQueue } = usePlayerStore.getState();

  if (artist.isLoading) return <p className="opacity-60">Cargando…</p>;
  if (artist.isError || !artist.data) return <p className="text-red-500">Artista no encontrado.</p>;

  return (
    <div className="space-y-8">
      <header className="flex items-end gap-6">
        <div className="h-32 w-32 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-secondary" />
        <div>
          <h1 className="text-4xl font-bold">{artist.data.name}</h1>
          {artist.data.bio && <p className="mt-2 max-w-xl text-sm opacity-70">{artist.data.bio}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="w-40">
              <Button
                type="button"
                onClick={() => tracks.data && playQueue(tracks.data.data, 0)}
                disabled={!tracks.data?.data.length}
              >
                ▶ Reproducir
              </Button>
            </div>
            <FollowButton type="artist" id={id} />
            <LikeButton type="artist" id={id} label />
            <Link
              to={`/radio?seedType=artist&seedId=${id}&label=${encodeURIComponent(artist.data.name)}`}
              className="rounded-lg border border-brand-secondary/30 px-3 py-2 text-sm font-medium hover:border-brand-secondary/60"
            >
              📻 Radio
            </Link>
          </div>
        </div>
      </header>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Pistas populares</h2>
        {tracks.data && <TrackList tracks={tracks.data.data} />}
      </section>

      {albums.data && albums.data.data.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-semibold">Álbumes</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {albums.data.data.map((album) => (
              <Link
                key={album._id}
                to={`/album/${album._id}`}
                className="rounded-xl border border-brand-secondary/15 bg-brand-primary/5 p-3 hover:border-brand-secondary/40"
              >
                <div className="mb-2 aspect-square rounded-lg bg-gradient-to-br from-brand-secondary to-brand-accent" />
                <p className="truncate font-medium">{album.name}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
