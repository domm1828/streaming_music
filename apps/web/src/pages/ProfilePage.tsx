import { Link, useParams } from 'react-router';
import { TrackList } from '../features/catalog/TrackList';
import { FollowButton } from '../features/social/FollowButton';
import { usePublicProfile } from '../features/profile/profile-queries';
import type { PlaylistSummary, RepostItem } from '../features/library/types';
import type { Track } from '../features/catalog/types';

function PlaylistGrid({ playlists }: { playlists: PlaylistSummary[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {playlists.map((pl) => (
        <Link
          key={pl._id}
          to={`/playlist/${pl._id}`}
          className="rounded-xl border border-brand-secondary/15 bg-brand-primary/5 p-3 hover:border-brand-secondary/40"
        >
          <div className="mb-2 aspect-square rounded-lg bg-gradient-to-br from-brand-primary to-brand-secondary" />
          <p className="truncate text-sm font-medium">{pl.name}</p>
        </Link>
      ))}
    </div>
  );
}

export function ProfilePage() {
  const { username = '' } = useParams();
  const { data, isLoading, isError } = usePublicProfile(username);

  if (isLoading) return <p className="opacity-60">Cargando…</p>;
  if (isError || !data) return <p className="text-red-500">Perfil no encontrado.</p>;

  const { user } = data;
  const repostTracks = data.reposts.filter((r) => r.type === 'track').map((r) => r.entity) as Track[];
  const repostPlaylists = data.reposts
    .filter((r: RepostItem) => r.type === 'playlist')
    .map((r) => r.entity) as PlaylistSummary[];

  return (
    <div className="space-y-10">
      <header className="overflow-hidden rounded-3xl border border-brand-secondary/20">
        <div className="h-32 bg-gradient-to-br from-brand-primary to-brand-secondary" />
        <div className="flex flex-col gap-4 px-6 pb-6 sm:flex-row sm:items-end">
          <div className="-mt-10 h-24 w-24 shrink-0 rounded-full border-4 border-[color:var(--surface)] bg-gradient-to-br from-brand-secondary to-brand-accent" />
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold">{user.name}</h1>
            <p className="text-sm opacity-60">@{user.username}</p>
            {user.bio && <p className="mt-2 opacity-80">{user.bio}</p>}
            <p className="mt-2 text-sm opacity-70">
              {user.followersCount} seguidores · {user.followingCount} siguiendo
              {user.country && ` · ${user.country}`}
            </p>
            {user.links.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-3 text-sm">
                {user.links.map((l) => (
                  <a
                    key={l.url}
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-secondary hover:underline"
                  >
                    {l.label}
                  </a>
                ))}
              </div>
            )}
          </div>
          <div>
            {data.isSelf ? (
              <Link
                to="/account/profile"
                className="rounded-full border border-brand-secondary/40 px-5 py-2 text-sm font-semibold hover:border-brand-secondary"
              >
                Editar perfil
              </Link>
            ) : (
              <FollowButton type="user" id={user._id} initialFollowing={data.isFollowing} />
            )}
          </div>
        </div>
      </header>

      {data.tracks.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-semibold">Pistas</h2>
          <TrackList tracks={data.tracks} />
        </section>
      )}

      {data.playlists.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-semibold">Playlists</h2>
          <PlaylistGrid playlists={data.playlists} />
        </section>
      )}

      {(repostTracks.length > 0 || repostPlaylists.length > 0) && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Reposts</h2>
          {repostTracks.length > 0 && <TrackList tracks={repostTracks} />}
          {repostPlaylists.length > 0 && <PlaylistGrid playlists={repostPlaylists} />}
        </section>
      )}

      {data.tracks.length === 0 && data.playlists.length === 0 && data.reposts.length === 0 && (
        <p className="opacity-60">Este perfil todavía no tiene contenido público.</p>
      )}
    </div>
  );
}
