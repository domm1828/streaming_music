import { currentTrack, usePlayerStore } from '../player/player-store';
import type { Track } from './types';

function fmt(d: number): string {
  if (!d) return '—';
  const m = Math.floor(d / 60);
  const s = Math.floor(d % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function TrackList({ tracks }: { tracks: Track[] }) {
  const playing = usePlayerStore(currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const { playQueue, togglePlay } = usePlayerStore.getState();

  if (tracks.length === 0) return <p className="opacity-60">No hay pistas todavía.</p>;

  return (
    <ul className="divide-y divide-brand-secondary/10">
      {tracks.map((track, i) => {
        const isCurrent = playing?._id === track._id;
        return (
          <li key={track._id} className="flex items-center gap-3 py-2">
            <button
              onClick={() => (isCurrent ? togglePlay() : playQueue(tracks, i))}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20"
              aria-label={isCurrent && isPlaying ? 'Pausar' : 'Reproducir'}
            >
              {isCurrent && isPlaying ? '⏸️' : '▶️'}
            </button>
            <span className="w-6 text-right text-sm tabular-nums opacity-50">{track.number || i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className={`truncate ${isCurrent ? 'font-semibold text-brand-primary' : ''}`}>{track.name}</p>
              <p className="truncate text-sm opacity-60">
                {track.artists?.map((a) => a.artist.name).join(', ')}
              </p>
            </div>
            <span className="text-sm tabular-nums opacity-50">{fmt(track.duration)}</span>
          </li>
        );
      })}
    </ul>
  );
}
