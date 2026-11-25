import { useParams } from 'react-router';
import { useGenreOverview } from '../features/catalog/catalog-queries';
import { TrackList } from '../features/catalog/TrackList';
import { MediaCard, MediaGrid } from '../components/MediaCard';
import { MediaHeader, PlayButton, SectionHeader } from '../components/media';
import { usePlayerStore } from '../features/player/player-store';

export function GenrePage() {
  const { id = '' } = useParams();
  const { data, isLoading, isError } = useGenreOverview(id);
  const { playQueue } = usePlayerStore.getState();

  if (isLoading) return <p className="text-muted">Cargando…</p>;
  if (isError || !data) return <p className="text-red-500">Género no encontrado.</p>;

  const { genre, artists, albums, topTracks } = data;

  return (
    <div className="space-y-8 pt-2">
      <MediaHeader
        image={genre.image}
        kicker="Género"
        title={genre.displayName}
        gradient="from-brand-secondary to-brand-accent"
        meta={`${artists.length} artistas · ${albums.length} álbumes`}
        actions={
          <PlayButton onClick={() => topTracks.length && playQueue(topTracks, 0)} disabled={!topTracks.length} />
        }
      />

      {topTracks.length > 0 && (
        <section>
          <SectionHeader title="Pistas populares" />
          <TrackList tracks={topTracks} showAlbum />
        </section>
      )}

      {artists.length > 0 && (
        <section>
          <SectionHeader title="Artistas" />
          <MediaGrid>
            {artists.map((a) => (
              <MediaCard key={a._id} to={`/artist/${a._id}`} title={a.name} image={a.image} shape="round" />
            ))}
          </MediaGrid>
        </section>
      )}

      {albums.length > 0 && (
        <section>
          <SectionHeader title="Álbumes" />
          <MediaGrid>
            {albums.map((al) => (
              <MediaCard
                key={al._id}
                to={`/album/${al._id}`}
                title={al.name}
                image={al.image}
                subtitle={al.releaseDate ? new Date(al.releaseDate).getFullYear().toString() : undefined}
                gradient="from-brand-primary to-brand-secondary"
              />
            ))}
          </MediaGrid>
        </section>
      )}

      {topTracks.length === 0 && artists.length === 0 && albums.length === 0 && (
        <p className="text-muted">Este género todavía no tiene contenido.</p>
      )}
    </div>
  );
}
