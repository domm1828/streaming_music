import { Link, useParams } from 'react-router';
import { TrackList } from '../features/catalog/TrackList';
import { MediaCard, MediaGrid } from '../components/MediaCard';
import { SectionHeader, pillClass } from '../components/media';
import { FollowButton } from '../features/social/FollowButton';
import { usePublicProfile } from '../features/profile/profile-queries';
import type { PlaylistSummary, RepostItem } from '../features/library/types';
import type { Track } from '../features/catalog/types';

function PlaylistGrid({ playlists }: { playlists: PlaylistSummary[] }) {
  return (
    <MediaGrid>
      {playlists.map((pl) => (
        <MediaCard key={pl._id} to={`/playlist/${pl._id}`} title={pl.name} />
      ))}
    </MediaGrid>
  );
}

export function ProfilePage() {
  const { username = '' } = useParams();
  const { data, isLoading, isError } = usePublicProfile(username);

  if (isLoading) return <p className="text-muted">Cargando…</p>;
  if (isError || !data) return <p className="text-red-500">Perfil no encontrado.</p>;

  const { user } = data;
  const repostTracks = data.reposts.filter((r) => r.type === 'track').map((r) => r.entity) as Track[];
  const repostPlaylists = data.reposts
    .filter((r: RepostItem) => r.type === 'playlist')
    .map((r) => r.entity) as PlaylistSummary[];

  return (
    <div className="space-y-10 pt-2">
      <header className="overflow-hidden rounded-panel bg-elevated shadow">
        <div className="h-36 bg-gradient-to-br from-brand-primary to-brand-secondary" />
        <div className="flex flex-col gap-4 px-6 pb-6 sm:flex-row sm:items-end">
          <div className="-mt-12 h-28 w-28 shrink-0 overflow-hidden rounded-full border-4 border-[color:var(--surface-elevated)] bg-gradient-to-br from-brand-secondary to-brand-accent">
            {user.image && <img src={user.image} alt="" className="h-full w-full object-cover" />}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold">{user.name}</h1>
            <p className="text-sm text-muted">@{user.username}</p>
            {user.bio && <p className="mt-2 text-main/85">{user.bio}</p>}
            <p className="mt-2 text-sm text-muted">
              {user.followersCount} seguidores · {user.followingCount} siguiendo
              {user.country && ` · ${user.country}`}
            </p>
            {user.links.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-3 text-sm">
                {user.links.map((l) => (
                  <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="text-brand-secondary hover:underline">
                    {l.label}
                  </a>
                ))}
              </div>
            )}
          </div>
          <div>
            {data.isSelf ? (
              <Link to="/account/profile" className={pillClass()}>
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
          <SectionHeader title="Pistas" />
          <TrackList tracks={data.tracks} showAlbum />
        </section>
      )}

      {data.playlists.length > 0 && (
        <section>
          <SectionHeader title="Playlists" />
          <PlaylistGrid playlists={data.playlists} />
        </section>
      )}

      {(repostTracks.length > 0 || repostPlaylists.length > 0) && (
        <section className="space-y-4">
          <SectionHeader title="Reposts" />
          {repostTracks.length > 0 && <TrackList tracks={repostTracks} showAlbum />}
          {repostPlaylists.length > 0 && <PlaylistGrid playlists={repostPlaylists} />}
        </section>
      )}

      {data.tracks.length === 0 && data.playlists.length === 0 && data.reposts.length === 0 && (
        <p className="text-muted">Este perfil todavía no tiene contenido público.</p>
      )}
    </div>
  );
}
