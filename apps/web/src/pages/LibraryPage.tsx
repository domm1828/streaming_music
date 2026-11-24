import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Plus } from 'lucide-react';
import { TrackList } from '../features/catalog/TrackList';
import { MediaCard, MediaGrid } from '../components/MediaCard';
import { Tabs } from '../components/Tabs';
import { useCreatePlaylist, useFollowedPlaylists, useMyPlaylists } from '../features/playlists/playlist-queries';
import { useFollowing, useMyLikes } from '../features/social/social-queries';
import { useHistory, useInsights, useListening } from '../features/profile/profile-queries';
import type { Album, ArtistRef, Track } from '../features/catalog/types';
import type { PlaylistSummary } from '../features/library/types';

type Tab = 'playlists' | 'songs' | 'albums' | 'artists' | 'history' | 'insights';
const TABS = [
  { key: 'playlists', label: 'Playlists' },
  { key: 'songs', label: 'Canciones' },
  { key: 'albums', label: 'Álbumes' },
  { key: 'artists', label: 'Artistas' },
  { key: 'history', label: 'Historial' },
  { key: 'insights', label: 'Insights' },
] as const;

function PlaylistsTab() {
  const mine = useMyPlaylists();
  const followed = useFollowedPlaylists();
  const create = useCreatePlaylist();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => create.mutate({ name: 'Nueva playlist' }, { onSuccess: (pl) => navigate(`/playlist/${pl._id}`) })}
        disabled={create.isPending}
        className="inline-flex items-center gap-2 rounded-full bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-primary-light disabled:opacity-60"
      >
        <Plus size={16} /> Crear playlist
      </button>

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Tuyas</h3>
        <MediaGrid>
          {mine.data?.data.map((pl) => (
            <MediaCard
              key={pl._id}
              to={`/playlist/${pl._id}`}
              title={pl.name}
              subtitle={`${pl.tracks?.length ?? 0} pistas`}
            />
          ))}
        </MediaGrid>
        {mine.data && mine.data.data.length === 0 && <p className="text-muted">Todavía no creaste playlists.</p>}
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Siguiendo</h3>
        <MediaGrid>
          {followed.data?.data.map((f) => {
            const pl = f.entity as PlaylistSummary;
            return (
              <MediaCard key={pl._id} to={`/playlist/${pl._id}`} title={pl.name} gradient="from-brand-secondary to-brand-accent" />
            );
          })}
        </MediaGrid>
        {followed.data && followed.data.data.length === 0 && <p className="text-muted">No seguís playlists todavía.</p>}
      </section>
    </div>
  );
}

function SongsTab() {
  const { data } = useMyLikes('track');
  const tracks = (data?.data.map((l) => l.entity) ?? []) as Track[];
  return <TrackList tracks={tracks} showAlbum />;
}

function AlbumsTab() {
  const { data } = useMyLikes('album');
  const albums = (data?.data.map((l) => l.entity) ?? []) as Album[];
  if (albums.length === 0) return <p className="text-muted">No guardaste álbumes.</p>;
  return (
    <MediaGrid>
      {albums.map((a) => (
        <MediaCard key={a._id} to={`/album/${a._id}`} title={a.name} image={a.image} gradient="from-brand-secondary to-brand-accent" />
      ))}
    </MediaGrid>
  );
}

function ArtistsTab() {
  const { data } = useFollowing('artist');
  const artists = (data?.data.map((f) => f.entity) ?? []) as ArtistRef[];
  if (artists.length === 0) return <p className="text-muted">No seguís artistas.</p>;
  return (
    <MediaGrid>
      {artists.map((a) => (
        <MediaCard key={a._id} to={`/artist/${a._id}`} title={a.name} image={a.image} shape="round" />
      ))}
    </MediaGrid>
  );
}

function HistoryTab() {
  const { data } = useHistory();
  const tracks = (data?.data.map((h) => h.track).filter(Boolean) ?? []) as Track[];
  if (tracks.length === 0) return <p className="text-muted">Todavía no escuchaste nada.</p>;
  return <TrackList tracks={tracks} showAlbum />;
}

function InsightsTab() {
  const listening = useListening();
  const insights = useInsights();
  return (
    <div className="space-y-6">
      {listening.data && (
        <div className="rounded-panel bg-chip p-5">
          <p className="text-sm text-muted">Minutos escuchados este mes</p>
          <p className="text-3xl font-bold text-brand-primary">
            {listening.data.usedMinutes}
            {listening.data.limitMinutes !== null && (
              <span className="text-base font-normal text-muted"> / {listening.data.limitMinutes}</span>
            )}
          </p>
        </div>
      )}
      <div className="grid gap-6 md:grid-cols-2">
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Más escuchadas</h3>
          <ol className="space-y-1">
            {insights.data?.topTracks.map((t) => (
              <li key={t.track._id} className="flex justify-between text-sm">
                <Link to={`/track/${t.track._id}`} className="truncate hover:underline">
                  {t.track.name}
                </Link>
                <span className="tabular-nums text-muted">{t.plays}</span>
              </li>
            ))}
            {insights.data && insights.data.topTracks.length === 0 && <li className="text-muted">Sin datos.</li>}
          </ol>
        </section>
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Artistas top</h3>
          <ol className="space-y-1">
            {insights.data?.topArtists.map((a) => (
              <li key={a.artist._id} className="flex justify-between text-sm">
                <Link to={`/artist/${a.artist._id}`} className="truncate hover:underline">
                  {a.artist.name}
                </Link>
                <span className="tabular-nums text-muted">{a.plays}</span>
              </li>
            ))}
            {insights.data && insights.data.topArtists.length === 0 && <li className="text-muted">Sin datos.</li>}
          </ol>
        </section>
      </div>
    </div>
  );
}

export function LibraryPage() {
  const [tab, setTab] = useState<Tab>('playlists');
  return (
    <div className="space-y-6 pt-2">
      <h1 className="text-3xl font-bold">Tu biblioteca</h1>
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      {tab === 'playlists' && <PlaylistsTab />}
      {tab === 'songs' && <SongsTab />}
      {tab === 'albums' && <AlbumsTab />}
      {tab === 'artists' && <ArtistsTab />}
      {tab === 'history' && <HistoryTab />}
      {tab === 'insights' && <InsightsTab />}
    </div>
  );
}
