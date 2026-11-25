import { Link, useParams } from 'react-router';
import { Download, Radio } from 'lucide-react';
import { useTrack } from '../features/catalog/catalog-queries';
import { usePlayerStore } from '../features/player/player-store';
import { LikeButton } from '../features/social/LikeButton';
import { ShareButton } from '../features/social/ShareButton';
import { AddToPlaylist } from '../features/playlists/AddToPlaylist';
import { OfflineButton } from '../features/offline/OfflineButton';
import { TrackList } from '../features/catalog/TrackList';
import { TrackComments } from '../features/community/TrackComments';
import { MediaHeader, PlayButton, SectionHeader, pillClass } from '../components/media';
import { useSimilarTracks } from '../features/discovery/discovery-queries';

export function TrackPage() {
  const { id = '' } = useParams();
  const { data, isLoading, isError } = useTrack(id);
  const similar = useSimilarTracks(id);
  const { playTrack } = usePlayerStore.getState();

  if (isLoading) return <p className="text-muted">Cargando…</p>;
  if (isError || !data) return <p className="text-red-500">Pista no encontrada.</p>;

  const track = data;
  const seekToTime = (seconds: number) => {
    const st = usePlayerStore.getState();
    const current = st.queue[st.index];
    if (current?._id === track._id) st.seekTo(seconds);
    else st.playTrack(track); // si no es la pista actual, la reproduce (y se puede reanclar luego)
  };

  return (
    <div className="space-y-8 pt-2">
      <MediaHeader
        image={data.image ?? data.album?.image ?? null}
        gradient="from-brand-primary to-brand-accent"
        kicker="Pista"
        title={data.name}
        meta={
          <span>
            {data.artists?.map((a, i) => (
              <span key={a.artist._id}>
                {i > 0 && ', '}
                <Link to={`/artist/${a.artist._id}`} className="font-medium text-main hover:underline">
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
          </span>
        }
        actions={
          <>
            <PlayButton onClick={() => playTrack(data)} />
            <LikeButton type="track" id={data._id} label />
            <AddToPlaylist trackId={data._id} />
            <ShareButton path={`/track/${data._id}`} title={data.name} embedPath={`/embed/track/${data._id}`} />
            <OfflineButton track={data} />
            <Link
              to={`/radio?seedType=track&seedId=${data._id}&label=${encodeURIComponent(data.name)}`}
              className={pillClass()}
            >
              <Radio size={16} /> Radio
            </Link>
            {data.srcType === 'audio' && data.src && (
              <a href={data.src} download={data.name} className={pillClass()}>
                <Download size={16} /> Descargar
              </a>
            )}
          </>
        }
      />

      {data.tags && data.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {data.tags.map((t) => (
            <Link
              key={t._id}
              to={`/tag/${t._id}`}
              className="rounded-full border border-divider px-3 py-1 text-xs text-muted transition hover:border-brand-secondary hover:text-main"
              style={t.color ? { borderColor: t.color, color: t.color } : undefined}
            >
              {t.displayName}
            </Link>
          ))}
        </div>
      )}

      {data.lyric ? (
        <section className="max-w-2xl rounded-panel bg-chip p-6">
          <h2 className="mb-3 text-lg font-semibold">Letra</h2>
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-main/90">{data.lyric.text}</pre>
        </section>
      ) : (
        <p className="text-muted">Esta pista no tiene letra.</p>
      )}

      {similar.data && similar.data.data.length > 0 && (
        <section>
          <SectionHeader title="Similares" />
          <TrackList tracks={similar.data.data} showAlbum />
        </section>
      )}

      <TrackComments trackId={track._id} onSeek={seekToTime} />
    </div>
  );
}
