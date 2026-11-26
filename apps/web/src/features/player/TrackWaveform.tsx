import { useMemo } from 'react';
import { useTrackWaveform } from '../catalog/waveform-queries';
import { useComments } from '../community/community-queries';
import { currentTrack, usePlayerStore } from './player-store';

const BARS = 120;

/** Onda determinística por pista cuando no hay waveform generado (degradación). */
function synthPeaks(seed: string, n = BARS): number[] {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    out.push(0.2 + ((h % 1000) / 1000) * 0.8);
  }
  return out;
}

/** Reescala una serie de peaks a `n` barras. */
function resample(src: number[], n: number): number[] {
  if (src.length === n) return src;
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(src[Math.floor((i * src.length) / n)] ?? 0);
  return out;
}

export function TrackWaveform({
  trackId,
  duration,
  onSeek,
}: {
  trackId: string;
  duration: number;
  onSeek: (seconds: number) => void;
}) {
  const wf = useTrackWaveform(trackId);
  const comments = useComments('track', trackId);
  const playing = usePlayerStore(currentTrack);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const isCurrent = playing?._id === trackId;

  const peaks = useMemo(() => {
    const raw = wf.data;
    return raw && raw.length ? resample(raw, BARS) : synthPeaks(trackId, BARS);
  }, [wf.data, trackId]);

  const progress = isCurrent && duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const markers = (comments.data?.data ?? []).filter((c) => c.timestamp != null);

  const seekFromClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    onSeek(frac * duration);
  };

  return (
    <div className="relative pt-2">
      <div
        onClick={seekFromClick}
        className="flex h-16 cursor-pointer items-end gap-[2px]"
        role="slider"
        aria-label="Barra de progreso"
        aria-valuenow={Math.round(progress * 100)}
      >
        {peaks.map((p, i) => {
          const played = (i + 0.5) / peaks.length <= progress;
          return (
            <div
              key={i}
              style={{ height: `${Math.max(6, Math.round(p * 100))}%` }}
              className={`flex-1 rounded-sm transition-colors ${played ? 'bg-brand-primary' : 'bg-divider'}`}
            />
          );
        })}
      </div>

      {duration > 0 &&
        markers.map((c) => (
          <button
            key={c._id}
            onClick={() => onSeek(c.timestamp as number)}
            title={`${c.user.name}: ${c.content}`}
            style={{ left: `${Math.min(100, ((c.timestamp as number) / duration) * 100)}%` }}
            className="absolute top-0 h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-elevated bg-brand-accent hover:scale-125"
            aria-label={`Comentario en ${c.timestamp}s`}
          />
        ))}
    </div>
  );
}
