import { currentTrack, usePlayerStore } from './player-store';

function fmt(t: number): string {
  if (!Number.isFinite(t) || t < 0) return '0:00';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function PlayerBar() {
  const track = usePlayerStore(currentTrack);
  const { isPlaying, currentTime, duration, repeat, shuffle, volume } = usePlayerStore();
  const { togglePlay, next, prev, seekTo, setVolume, cycleRepeat, toggleShuffle } =
    usePlayerStore.getState();

  if (!track) return null;
  const artists = track.artists?.map((a) => a.artist.name).join(', ') ?? '';

  return (
    <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-secondary/20 bg-[color:var(--surface)]/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{track.name}</p>
          <p className="truncate text-sm opacity-70">{artists}</p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={toggleShuffle} title="Aleatorio" className={shuffle ? 'text-brand-accent' : 'opacity-60'}>
            🔀
          </button>
          <button onClick={prev} title="Anterior" className="opacity-80">⏮️</button>
          <button
            onClick={togglePlay}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary text-white"
          >
            {isPlaying ? '⏸️' : '▶️'}
          </button>
          <button onClick={next} title="Siguiente" className="opacity-80">⏭️</button>
          <button onClick={cycleRepeat} title={`Repetir: ${repeat}`} className={repeat !== 'off' ? 'text-brand-accent' : 'opacity-60'}>
            {repeat === 'one' ? '🔂' : '🔁'}
          </button>
        </div>

        <div className="hidden flex-1 items-center gap-2 sm:flex">
          <span className="w-10 text-right text-xs tabular-nums opacity-60">{fmt(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || track.duration || 0}
            value={currentTime}
            onChange={(e) => seekTo(Number(e.target.value))}
            className="h-1 flex-1 accent-brand-accent"
          />
          <span className="w-10 text-xs tabular-nums opacity-60">{fmt(duration || track.duration)}</span>
        </div>

        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="hidden w-20 accent-brand-primary md:block"
          title="Volumen"
        />
      </div>
    </footer>
  );
}
