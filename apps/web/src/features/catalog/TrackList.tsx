import { useState } from 'react';
import { Link } from 'react-router';
import { ChevronLeft, ListEnd, ListMusic, ListPlus, MoreHorizontal, Pause, Play } from 'lucide-react';
import { currentTrack, usePlayerStore } from '../player/player-store';
import { EqualizerBars } from '../player/EqualizerBars';
import { useAuth } from '../auth/use-auth';
import { useAddTrackToPlaylist, useMyPlaylists } from '../playlists/playlist-queries';
import type { Track } from './types';

function fmt(d: number): string {
  if (!d) return '—';
  const m = Math.floor(d / 60);
  const s = Math.floor(d % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function MenuButton({ icon, children, onClick }: { icon: React.ReactNode; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-main hover:bg-main/10"
    >
      {icon}
      {children}
    </button>
  );
}

export function TrackList({ tracks, showAlbum = false }: { tracks: Track[]; showAlbum?: boolean }) {
  const playing = usePlayerStore(currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const { playQueue, togglePlay, playNext, addToQueue } = usePlayerStore.getState();
  const { isAuthenticated } = useAuth();
  const myPlaylists = useMyPlaylists();
  const addToPlaylist = useAddTrackToPlaylist();
  const [menu, setMenu] = useState<number | null>(null);
  const [plSub, setPlSub] = useState(false);

  const closeMenu = () => {
    setMenu(null);
    setPlSub(false);
  };

  if (tracks.length === 0) return <p className="text-muted">No hay pistas todavía.</p>;

  return (
    <div className="relative">
      {menu !== null && <div className="fixed inset-0 z-10" onClick={closeMenu} />}
      <ul>
        {tracks.map((track, i) => {
          const isCurrent = playing?._id === track._id;
          const artwork = track.image ?? track.album?.image ?? null;
          return (
            <li
              key={track._id}
              onContextMenu={(e) => {
                e.preventDefault();
                setMenu(i);
              }}
              className="group relative flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-main/5"
            >
              <div className="flex w-6 justify-center">
                <span className={`tabular-nums text-sm text-muted ${isCurrent && isPlaying ? 'hidden' : 'group-hover:hidden'}`}>
                  {track.number || i + 1}
                </span>
                <button
                  onClick={() => (isCurrent ? togglePlay() : playQueue(tracks, i))}
                  className={`text-main ${isCurrent && isPlaying ? 'flex' : 'hidden group-hover:flex'}`}
                  aria-label={isCurrent && isPlaying ? 'Pausar' : 'Reproducir'}
                >
                  {isCurrent && isPlaying ? <Pause size={16} /> : <Play size={16} />}
                </button>
              </div>

              {artwork ? (
                <img src={artwork} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded object-cover" />
              ) : (
                <div className="h-10 w-10 shrink-0 rounded bg-gradient-to-br from-brand-primary to-brand-secondary" />
              )}

              <div className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  {isCurrent && isPlaying && <EqualizerBars className="shrink-0" />}
                  <Link
                    to={`/track/${track._id}`}
                    className={`block truncate text-sm font-medium hover:underline ${isCurrent ? 'text-brand-primary' : ''}`}
                  >
                    {track.name}
                  </Link>
                </span>
                <p className="truncate text-xs text-muted">
                  {track.artists?.map((a, j) => (
                    <span key={a.artist._id}>
                      {j > 0 && ', '}
                      <Link to={`/artist/${a.artist._id}`} className="hover:underline">
                        {a.artist.name}
                      </Link>
                    </span>
                  ))}
                </p>
              </div>

              {showAlbum && track.album && (
                <Link
                  to={`/album/${track.album._id}`}
                  className="hidden min-w-0 flex-1 truncate text-sm text-muted hover:underline md:block"
                >
                  {track.album.name}
                </Link>
              )}

              <span className="shrink-0 tabular-nums text-sm text-muted">{fmt(track.duration)}</span>

              <div className="relative shrink-0">
                <button
                  onClick={() => { setPlSub(false); setMenu(menu === i ? null : i); }}
                  className="rounded-full p-1 text-muted opacity-0 transition hover:bg-main/10 hover:text-main focus:opacity-100 group-hover:opacity-100"
                  aria-label="Más opciones"
                >
                  <MoreHorizontal size={18} />
                </button>
                {menu === i && (
                  <div className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-lg border border-divider bg-elevated py-1 shadow-xl">
                    {plSub ? (
                      <div className="max-h-64 overflow-auto">
                        <button onClick={() => setPlSub(false)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-muted hover:bg-main/10">
                          <ChevronLeft size={15} /> Volver
                        </button>
                        {myPlaylists.data?.data.map((pl) => (
                          <button
                            key={pl._id}
                            onClick={() => { addToPlaylist.mutate({ playlistId: pl._id, trackId: track._id }); closeMenu(); }}
                            className="block w-full truncate px-3 py-2 text-left text-sm text-main hover:bg-main/10"
                          >
                            {pl.name}
                          </button>
                        ))}
                        {myPlaylists.data && myPlaylists.data.data.length === 0 && (
                          <p className="px-3 py-2 text-xs text-muted">No tenés playlists.</p>
                        )}
                      </div>
                    ) : (
                      <>
                        <MenuButton icon={<Play size={15} />} onClick={() => { playQueue(tracks, i); closeMenu(); }}>Reproducir</MenuButton>
                        <MenuButton icon={<ListPlus size={15} />} onClick={() => { playNext([track]); closeMenu(); }}>Reproducir a continuación</MenuButton>
                        <MenuButton icon={<ListEnd size={15} />} onClick={() => { addToQueue([track]); closeMenu(); }}>Agregar a la cola</MenuButton>
                        {isAuthenticated && (
                          <MenuButton icon={<ListMusic size={15} />} onClick={() => setPlSub(true)}>Agregar a playlist</MenuButton>
                        )}
                        {track.artists?.[0] && (
                          <Link to={`/artist/${track.artists[0].artist._id}`} onClick={closeMenu} className="block px-3 py-2 text-sm text-main hover:bg-main/10">Ir al artista</Link>
                        )}
                        {track.album && (
                          <Link to={`/album/${track.album._id}`} onClick={closeMenu} className="block px-3 py-2 text-sm text-main hover:bg-main/10">Ir al álbum</Link>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
