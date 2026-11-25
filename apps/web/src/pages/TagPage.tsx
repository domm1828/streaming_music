import { useParams } from 'react-router';
import { useTagOverview } from '../features/catalog/catalog-queries';
import { TrackList } from '../features/catalog/TrackList';
import { MediaHeader, PlayButton } from '../components/media';
import { usePlayerStore } from '../features/player/player-store';

export function TagPage() {
  const { id = '' } = useParams();
  const { data, isLoading, isError } = useTagOverview(id);
  const { playQueue } = usePlayerStore.getState();

  if (isLoading) return <p className="text-muted">Cargando…</p>;
  if (isError || !data) return <p className="text-red-500">Tag no encontrado.</p>;

  const { tag, tracks } = data;

  return (
    <div className="space-y-8 pt-2">
      <MediaHeader
        kicker="Tag"
        title={tag.displayName}
        gradient={tag.color ? '' : 'from-brand-accent to-brand-primary'}
        meta={tag.description ?? `${tracks.length} pistas`}
        actions={<PlayButton onClick={() => tracks.length && playQueue(tracks, 0)} disabled={!tracks.length} />}
      />
      {tracks.length > 0 ? (
        <TrackList tracks={tracks} showAlbum />
      ) : (
        <p className="text-muted">Este tag todavía no tiene pistas.</p>
      )}
    </div>
  );
}
