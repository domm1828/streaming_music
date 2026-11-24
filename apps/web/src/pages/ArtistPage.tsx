import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { Radio } from 'lucide-react';
import { useArtist, useArtistAlbums, useArtistTracks } from '../features/catalog/catalog-queries';
import { TrackList } from '../features/catalog/TrackList';
import { MediaCard, MediaGrid } from '../components/MediaCard';
import { Tabs } from '../components/Tabs';
import { MediaHeader, PlayButton, pillClass } from '../components/media';
import { usePlayerStore } from '../features/player/player-store';
import { FollowButton } from '../features/social/FollowButton';
import { LikeButton } from '../features/social/LikeButton';
import { ShareButton } from '../features/social/ShareButton';

type Tab = 'popular' | 'discography' | 'about';

export function ArtistPage() {
  const { id = '' } = useParams();
  const artist = useArtist(id);
  const tracks = useArtistTracks(id);
  const albums = useArtistAlbums(id);
  const { playQueue } = usePlayerStore.getState();
  const [tab, setTab] = useState<Tab>('popular');

  if (artist.isLoading) return <p className="text-muted">Cargando…</p>;
  if (artist.isError || !artist.data) return <p className="text-red-500">Artista no encontrado.</p>;

  const hasAlbums = (albums.data?.data.length ?? 0) > 0;
  const TABS = [
    { key: 'popular' as const, label: 'Popular' },
    ...(hasAlbums ? [{ key: 'discography' as const, label: 'Discografía' }] : []),
    { key: 'about' as const, label: 'Sobre' },
  ];

  return (
    <div className="space-y-8 pt-2">
      <MediaHeader
        image={artist.data.image}
        shape="round"
        kicker="Artista"
        title={artist.data.name}
        meta={artist.data.genres && artist.data.genres.length > 0 ? artist.data.genres.map((g) => g.displayName).join(' · ') : undefined}
        actions={
          <>
            <PlayButton
              onClick={() => tracks.data && playQueue(tracks.data.data, 0)}
              disabled={!tracks.data?.data.length}
            />
            <FollowButton type="artist" id={id} />
            <LikeButton type="artist" id={id} label />
            <ShareButton path={`/artist/${id}`} title={artist.data.name} />
            <Link
              to={`/radio?seedType=artist&seedId=${id}&label=${encodeURIComponent(artist.data.name)}`}
              className={pillClass()}
            >
              <Radio size={16} /> Radio
            </Link>
          </>
        }
      />

      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      {tab === 'popular' && tracks.data && <TrackList tracks={tracks.data.data} showAlbum />}

      {tab === 'discography' && (
        <MediaGrid>
          {albums.data?.data.map((album) => (
            <MediaCard
              key={album._id}
              to={`/album/${album._id}`}
              title={album.name}
              image={album.image}
              subtitle={album.releaseDate ? new Date(album.releaseDate).getFullYear().toString() : undefined}
              gradient="from-brand-secondary to-brand-accent"
            />
          ))}
        </MediaGrid>
      )}

      {tab === 'about' && (
        <div className="max-w-2xl space-y-4">
          {artist.data.bio ? (
            <p className="whitespace-pre-wrap leading-relaxed text-main/90">{artist.data.bio}</p>
          ) : (
            <p className="text-muted">Este artista todavía no tiene biografía.</p>
          )}
          {typeof artist.data.views === 'number' && (
            <p className="text-sm text-muted">{artist.data.views.toLocaleString()} reproducciones</p>
          )}
        </div>
      )}
    </div>
  );
}
