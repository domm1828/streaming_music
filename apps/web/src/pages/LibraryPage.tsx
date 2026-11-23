import { useState } from 'react';
import { Link } from 'react-router';
import { TrackList } from '../features/catalog/TrackList';
import { useFollowedPlaylists, useMyPlaylists } from '../features/playlists/playlist-queries';
import { useCreatePlaylist } from '../features/playlists/playlist-queries';
import { useFollowing, useMyLikes } from '../features/social/social-queries';
import { useHistory, useInsights, useListening } from '../features/profile/profile-queries';
import type { Album, ArtistRef, Track } from '../features/catalog/types';
import type { PlaylistSummary } from '../features/library/types';

type Tab = 'playlists' | 'songs' | 'albums' | 'artists' | 'history' | 'insights';
const TABS: { key: Tab; label: string }[] = [
  { key: 'playlists', label: 'Playlists' },
  { key: 'songs', label: 'Canciones' },
  { key: 'albums', label: 'Álbumes' },
  { key: 'artists', label: 'Artistas' },
  { key: 'history', label: 'Historial' },
  { key: 'insights', label: 'Insights' },
];

function Card({ to, title, subtitle, gradient }: { to: string; title: string; subtitle?: string; gradient: string }) {
  return (
    <Link
      to={to}
      className="rounded-xl border border-brand-secondary/15 bg-brand-primary/5 p-3 hover:border-brand-secondary/40"
    >
      <div className={`mb-2 aspect-square rounded-lg bg-gradient-to-br ${gradient}`} />
      <p className="truncate text-sm font-medium">{title}</p>
      {subtitle && <p className="truncate text-xs opacity-60">{subtitle}</p>}
    </Link>
  );
}

function PlaylistsTab() {
  const mine = useMyPlaylists();
  const followed = useFollowedPlaylists();
  const create = useCreatePlaylist();

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => create.mutate({ name: 'Nueva playlist' })}
        disabled={create.isPending}
        className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        + Crear playlist
      </button>

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide opacity-70">Tuyas</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {mine.data?.data.map((pl) => (
            <Card
              key={pl._id}
              to={`/playlist/${pl._id}`}
              title={pl.name}
              subtitle={`${pl.tracks?.length ?? 0} pistas`}
              gradient="from-brand-primary to-brand-secondary"
            />
          ))}
        </div>
        {mine.data && mine.data.data.length === 0 && <p className="opacity-60">Todavía no creaste playlists.</p>}
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide opacity-70">Siguiendo</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {followed.data?.data.map((f) => {
            const pl = f.entity as PlaylistSummary;
            return (
              <Card
                key={pl._id}
                to={`/playlist/${pl._id}`}
                title={pl.name}
                gradient="from-brand-secondary to-brand-accent"
              />
            );
          })}
        </div>
        {followed.data && followed.data.data.length === 0 && (
          <p className="opacity-60">No seguís playlists todavía.</p>
        )}
      </section>
    </div>
  );
}

function SongsTab() {
  const { data } = useMyLikes('track');
  const tracks = (data?.data.map((l) => l.entity) ?? []) as Track[];
  return <TrackList tracks={tracks} />;
}

function AlbumsTab() {
  const { data } = useMyLikes('album');
  const albums = (data?.data.map((l) => l.entity) ?? []) as Album[];
  if (albums.length === 0) return <p className="opacity-60">No guardaste álbumes.</p>;
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
      {albums.map((a) => (
        <Card key={a._id} to={`/album/${a._id}`} title={a.name} gradient="from-brand-secondary to-brand-accent" />
      ))}
    </div>
  );
}

function ArtistsTab() {
  const { data } = useFollowing('artist');
  const artists = (data?.data.map((f) => f.entity) ?? []) as ArtistRef[];
  if (artists.length === 0) return <p className="opacity-60">No seguís artistas.</p>;
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
      {artists.map((a) => (
        <Card key={a._id} to={`/artist/${a._id}`} title={a.name} gradient="from-brand-primary to-brand-secondary" />
      ))}
    </div>
  );
}

function HistoryTab() {
  const { data } = useHistory();
  const tracks = (data?.data.map((h) => h.track).filter(Boolean) ?? []) as Track[];
  if (tracks.length === 0) return <p className="opacity-60">Todavía no escuchaste nada.</p>;
  return <TrackList tracks={tracks} />;
}

function InsightsTab() {
  const listening = useListening();
  const insights = useInsights();
  return (
    <div className="space-y-6">
      {listening.data && (
        <div className="rounded-2xl border border-brand-secondary/20 bg-brand-primary/5 p-5">
          <p className="text-sm opacity-70">Minutos escuchados este mes</p>
          <p className="text-3xl font-bold text-brand-primary">
            {listening.data.usedMinutes}
            {listening.data.limitMinutes !== null && (
              <span className="text-base font-normal opacity-60"> / {listening.data.limitMinutes}</span>
            )}
          </p>
        </div>
      )}
      <div className="grid gap-6 md:grid-cols-2">
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide opacity-70">Más escuchadas</h3>
          <ol className="space-y-1">
            {insights.data?.topTracks.map((t) => (
              <li key={t.track._id} className="flex justify-between text-sm">
                <Link to={`/track/${t.track._id}`} className="truncate hover:underline">
                  {t.track.name}
                </Link>
                <span className="tabular-nums opacity-60">{t.plays}</span>
              </li>
            ))}
            {insights.data && insights.data.topTracks.length === 0 && <li className="opacity-60">Sin datos.</li>}
          </ol>
        </section>
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide opacity-70">Artistas top</h3>
          <ol className="space-y-1">
            {insights.data?.topArtists.map((a) => (
              <li key={a.artist._id} className="flex justify-between text-sm">
                <Link to={`/artist/${a.artist._id}`} className="truncate hover:underline">
                  {a.artist.name}
                </Link>
                <span className="tabular-nums opacity-60">{a.plays}</span>
              </li>
            ))}
            {insights.data && insights.data.topArtists.length === 0 && <li className="opacity-60">Sin datos.</li>}
          </ol>
        </section>
      </div>
    </div>
  );
}

export function LibraryPage() {
  const [tab, setTab] = useState<Tab>('playlists');
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Tu biblioteca</h1>
      <div className="flex flex-wrap gap-2 border-b border-brand-secondary/20 pb-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              tab === t.key ? 'bg-brand-primary text-white' : 'hover:bg-brand-primary/10'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'playlists' && <PlaylistsTab />}
      {tab === 'songs' && <SongsTab />}
      {tab === 'albums' && <AlbumsTab />}
      {tab === 'artists' && <ArtistsTab />}
      {tab === 'history' && <HistoryTab />}
      {tab === 'insights' && <InsightsTab />}
    </div>
  );
}
