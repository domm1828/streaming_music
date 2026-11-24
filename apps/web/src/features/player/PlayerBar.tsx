import { Download, ListMusic, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { Link } from 'react-router';
import { IconButton } from '../../components/IconButton';
import { LikeButton } from '../social/LikeButton';
import { currentTrack, usePlayerStore } from './player-store';

function fmt(t: number): string {
  if (!Number.isFinite(t) || t < 0) return '0:00';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function PlayerBar({ onToggleQueue, queueOpen }: { onToggleQueue: () => void; queueOpen: boolean }) {
  const track = usePlayerStore(currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const repeat = usePlayerStore((s) => s.repeat);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const volume = usePlayerStore((s) => s.volume);
  const { togglePlay, next, prev, seekTo, setVolume, cycleRepeat, toggleShuffle } = usePlayerStore.getState();

  if (!track) return null;
  const artwork = track.image ?? track.album?.image ?? null;
  const total = duration || track.duration || 0;

  return (
    <footer className="rounded-panel bg-elevated px-3 py-2.5">
      <div className="flex items-center gap-3">
        {/* Izquierda: carátula + info + like */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link to={`/track/${track._id}`} className="shrink-0">
            {artwork ? (
              <img src={artwork} alt="" className="h-12 w-12 rounded-md object-cover" />
            ) : (
              <div className="h-12 w-12 rounded-md bg-gradient-to-br from-brand-primary to-brand-accent" />
            )}
          </Link>
          <div className="min-w-0">
            <Link to={`/track/${track._id}`} className="block truncate text-sm font-semibold hover:underline">
              {track.name}
            </Link>
            <p className="truncate text-xs text-muted">
              {track.artists?.map((a, i) => (
                <span key={a.artist._id}>
                  {i > 0 && ', '}
                  <Link to={`/artist/${a.artist._id}`} className="hover:underline">{a.artist.name}</Link>
                </span>
              ))}
            </p>
          </div>
          <div className="hidden shrink-0 sm:block">
            <LikeButton type="track" id={track._id} />
          </div>
        </div>

        {/* Centro: controles + seekbar */}
        <div className="flex max-w-xl flex-[1.4] flex-col items-center gap-1">
          <div className="flex items-center gap-1">
            <IconButton size="sm" active={shuffle} onClick={toggleShuffle} aria-label="Aleatorio">
              <Shuffle size={16} />
            </IconButton>
            <IconButton size="sm" onClick={prev} aria-label="Anterior">
              <SkipBack size={18} />
            </IconButton>
            <IconButton variant="solid" size="md" onClick={togglePlay} aria-label={isPlaying ? 'Pausar' : 'Reproducir'}>
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </IconButton>
            <IconButton size="sm" onClick={next} aria-label="Siguiente">
              <SkipForward size={18} />
            </IconButton>
            <IconButton size="sm" active={repeat !== 'off'} onClick={cycleRepeat} aria-label={`Repetir: ${repeat}`}>
              {repeat === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
            </IconButton>
          </div>
          <div className="hidden w-full items-center gap-2 sm:flex">
            <span className="w-9 text-right text-[11px] tabular-nums text-muted">{fmt(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={total}
              value={currentTime}
              onChange={(e) => seekTo(Number(e.target.value))}
              className="h-1 flex-1 cursor-pointer accent-brand-accent"
              aria-label="Progreso"
            />
            <span className="w-9 text-[11px] tabular-nums text-muted">{fmt(total)}</span>
          </div>
        </div>

        {/* Derecha: cola + descarga + volumen */}
        <div className="flex flex-1 items-center justify-end gap-1">
          {track.srcType === 'audio' && track.src && (
            <a
              href={track.src}
              download={track.name}
              className="hidden rounded-full p-2 text-muted hover:bg-main/10 hover:text-main md:inline-flex"
              aria-label="Descargar"
            >
              <Download size={16} />
            </a>
          )}
          <IconButton size="sm" active={queueOpen} onClick={onToggleQueue} aria-label="Cola" className="hidden lg:inline-flex">
            <ListMusic size={16} />
          </IconButton>
          <div className="hidden items-center gap-1 md:flex">
            <button onClick={() => setVolume(volume > 0 ? 0 : 0.8)} className="rounded-full p-2 text-muted hover:text-main" aria-label="Silenciar">
              {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-20 cursor-pointer accent-brand-primary"
              aria-label="Volumen"
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
