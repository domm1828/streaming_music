import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { ChevronDown, Loader2, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward } from 'lucide-react';
import { Link } from 'react-router';
import { IconButton } from '../../components/IconButton';
import { LikeButton } from '../social/LikeButton';
import { useTrackLyrics } from '../admin/catalog-admin-queries';
import { activeLineIndex, parseLyrics } from './lrc';
import { currentTrack, usePlayerStore } from './player-store';

function fmt(t: number): string {
  if (!Number.isFinite(t) || t < 0) return '0:00';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function FullscreenPlayer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const track = usePlayerStore(currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const buffered = usePlayerStore((s) => s.buffered);
  const buffering = usePlayerStore((s) => s.buffering);
  const repeat = usePlayerStore((s) => s.repeat);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const { togglePlay, next, prev, seekTo, cycleRepeat, toggleShuffle } = usePlayerStore.getState();

  const { data: lyrics } = useTrackLyrics(track?._id ?? '', open && Boolean(track));
  const parsed = useMemo(() => (lyrics ? parseLyrics(lyrics.text) : null), [lyrics]);
  const active = parsed?.synced ? activeLineIndex(parsed.lines, currentTime) : -1;
  const activeRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [active]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const hasVideo = track?.srcType === 'youtube' || track?.srcType === 'video';
  const videoSlotRef = useRef<HTMLDivElement | null>(null);

  // Mientras el overlay está abierto en una pista con video (YouTube o archivo),
  // se ubica el video (único del player) sobre este slot, midiéndolo y guardándolo.
  useEffect(() => {
    const setVideoBox = usePlayerStore.getState().setVideoBox;
    if (!open || !hasVideo) {
      setVideoBox(null);
      return;
    }
    const measure = () => {
      const el = videoSlotRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setVideoBox({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    const raf = requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
      setVideoBox(null);
    };
  }, [open, hasVideo, track?._id]);

  if (!open || !track) return null;
  const artwork = track.image ?? track.album?.image ?? null;
  const total = duration || track.duration || 0;
  const playedPct = total > 0 ? Math.min(100, (currentTime / total) * 100) : 0;
  const bufferedPct = total > 0 ? Math.min(100, (buffered / total) * 100) : 0;
  const seekStyle = { '--played': `${playedPct}%`, '--buffered': `${bufferedPct}%` } as CSSProperties;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface/95 backdrop-blur-xl">
      <div className="flex items-center justify-between p-4">
        <button onClick={onClose} className="rounded-full p-2 text-muted hover:bg-main/10 hover:text-main" aria-label="Minimizar">
          <ChevronDown size={22} />
        </button>
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">Reproduciendo</span>
        <span className="w-9" />
      </div>

      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-8 overflow-hidden px-6 pb-8 md:flex-row md:items-center">
        {/* Artwork + info + controles */}
        <div className="flex min-w-0 flex-1 flex-col items-center gap-6">
          <div
            ref={videoSlotRef}
            className={`w-full overflow-hidden rounded-2xl bg-chip shadow-2xl ${
              hasVideo ? 'aspect-video max-w-2xl' : 'aspect-square max-w-sm'
            }`}
          >
            {hasVideo ? null : artwork ? (
              <img src={artwork} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-brand-primary to-brand-accent" />
            )}
          </div>
          <div className="w-full max-w-sm text-center">
            <Link to={`/track/${track._id}`} onClick={onClose} className="block truncate text-2xl font-bold hover:underline">
              {track.name}
            </Link>
            <p className="mt-1 truncate text-muted">
              {track.artists?.map((a, i) => (
                <span key={a.artist._id}>
                  {i > 0 && ', '}
                  <Link to={`/artist/${a.artist._id}`} onClick={onClose} className="hover:underline">
                    {a.artist.name}
                  </Link>
                </span>
              ))}
            </p>
          </div>

          <div className="w-full max-w-sm">
            <div className="flex items-center gap-2">
              <span className="w-10 text-right text-[11px] tabular-nums text-muted">{fmt(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={total}
                value={currentTime}
                onChange={(e) => seekTo(Number(e.target.value))}
                className="sm-seek flex-1"
                style={seekStyle}
                aria-label="Progreso"
              />
              <span className="w-10 text-[11px] tabular-nums text-muted">{fmt(total)}</span>
            </div>
            <div className="mt-3 flex items-center justify-center gap-3">
              <IconButton active={shuffle} onClick={toggleShuffle} aria-label="Aleatorio"><Shuffle size={18} /></IconButton>
              <IconButton onClick={prev} aria-label="Anterior"><SkipBack size={22} /></IconButton>
              <IconButton variant="solid" size="lg" onClick={togglePlay} aria-label={isPlaying ? 'Pausar' : 'Reproducir'}>
                {buffering && isPlaying ? (
                  <Loader2 size={24} className="animate-spin" />
                ) : isPlaying ? (
                  <Pause size={24} />
                ) : (
                  <Play size={24} />
                )}
              </IconButton>
              <IconButton onClick={next} aria-label="Siguiente"><SkipForward size={22} /></IconButton>
              <IconButton active={repeat !== 'off'} onClick={cycleRepeat} aria-label={`Repetir: ${repeat}`}>
                {repeat === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
              </IconButton>
            </div>
            <div className="mt-3 flex justify-center">
              <LikeButton type="track" id={track._id} label />
            </div>
          </div>
        </div>

        {/* Letra */}
        <div className="hidden min-h-0 flex-1 overflow-y-auto md:block">
          {parsed && parsed.lines.length > 0 ? (
            parsed.synced ? (
              <ul className="space-y-2">
                {parsed.lines.map((line, i) => (
                  <li key={i}>
                    <button
                      ref={i === active ? activeRef : undefined}
                      onClick={() => line.time !== null && seekTo(line.time)}
                      className={`block text-left text-lg leading-snug transition ${
                        i === active ? 'font-semibold text-main' : 'text-muted hover:text-main'
                      }`}
                    >
                      {line.text || '♪'}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed text-muted">
                {parsed.lines.map((l) => l.text).join('\n')}
              </pre>
            )
          ) : (
            <p className="text-muted">Esta pista no tiene letra.</p>
          )}
        </div>
      </div>
    </div>
  );
}
