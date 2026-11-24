import { useState } from 'react';
import { Link } from 'react-router';
import { ListEnd, ListPlus, MoreHorizontal, Pause, Play } from 'lucide-react';
import { currentTrack, usePlayerStore } from '../player/player-store';
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
  const [menu, setMenu] = useState<number | null>(null);

  if (tracks.length === 0) return <p className="text-muted">No hay pistas todavía.</p>;

  return (
    <div className="relative">
      {menu !== null && <div className="fixed inset-0 z-10" onClick={() => setMenu(null)} />}
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
                <Link
                  to={`/track/${track._id}`}
                  className={`block truncate text-sm font-medium hover:underline ${isCurrent ? 'text-brand-primary' : ''}`}
                >
                  {track.name}
                </Link>
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
                  onClick={() => setMenu(menu === i ? null : i)}
                  className="rounded-full p-1 text-muted opacity-0 transition hover:bg-main/10 hover:text-main focus:opacity-100 group-hover:opacity-100"
                  aria-label="Más opciones"
                >
                  <MoreHorizontal size={18} />
                </button>
                {menu === i && (
                  <div className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-lg border border-divider bg-elevated py-1 shadow-xl">
                    <MenuButton
                      icon={<Play size={15} />}
                      onClick={() => {
                        playQueue(tracks, i);
                        setMenu(null);
                      }}
                    >
                      Reproducir
                    </MenuButton>
                    <MenuButton
                      icon={<ListPlus size={15} />}
                      onClick={() => {
                        playNext([track]);
                        setMenu(null);
                      }}
                    >
                      Reproducir a continuación
                    </MenuButton>
                    <MenuButton
                      icon={<ListEnd size={15} />}
                      onClick={() => {
                        addToQueue([track]);
                        setMenu(null);
                      }}
                    >
                      Agregar a la cola
                    </MenuButton>
                    {track.artists?.[0] && (
                      <Link
                        to={`/artist/${track.artists[0].artist._id}`}
                        onClick={() => setMenu(null)}
                        className="block px-3 py-2 text-sm text-main hover:bg-main/10"
                      >
                        Ir al artista
                      </Link>
                    )}
                    {track.album && (
                      <Link
                        to={`/album/${track.album._id}`}
                        onClick={() => setMenu(null)}
                        className="block px-3 py-2 text-sm text-main hover:bg-main/10"
                      >
                        Ir al álbum
                      </Link>
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
