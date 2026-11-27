import { useState } from 'react';
import { Link } from 'react-router';
import { Play, Search, Video } from 'lucide-react';
import { useDebounce } from '../lib/use-debounce';
import { useVideoTracks } from '../features/catalog/catalog-queries';
import { usePlayerStore } from '../features/player/player-store';
import type { Track } from '../features/catalog/types';

function fmt(d: number): string {
  if (!d) return '';
  const m = Math.floor(d / 60);
  const s = Math.floor(d % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function VideoCard({ videos, index }: { videos: Track[]; index: number }) {
  const video = videos[index];
  const { playQueue } = usePlayerStore.getState();
  const artwork = video.image ?? video.album?.image ?? null;
  return (
    <div className="group overflow-hidden rounded-panel border border-divider bg-elevated transition hover:border-brand-secondary">
      <button
        type="button"
        onClick={() => playQueue(videos, index)}
        className="relative block aspect-video w-full bg-chip"
        aria-label={`Reproducir ${video.name}`}
      >
        {artwork ? (
          <img src={artwork} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-primary to-brand-accent">
            <Video size={28} className="text-white/80" />
          </div>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary text-white shadow-lg">
            <Play size={20} className="translate-x-0.5" />
          </span>
        </span>
        {video.duration > 0 && (
          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">
            {fmt(video.duration)}
          </span>
        )}
      </button>
      <div className="p-3">
        <Link to={`/track/${video._id}`} className="block truncate text-sm font-semibold hover:underline">
          {video.name}
        </Link>
        <p className="truncate text-xs text-muted">
          {video.artists?.map((a, i) => (
            <span key={a.artist._id}>
              {i > 0 && ', '}
              <Link to={`/artist/${a.artist._id}`} className="hover:underline">
                {a.artist.name}
              </Link>
            </span>
          )) || 'Sin artista'}
        </p>
      </div>
    </div>
  );
}

export function VideosPage() {
  const [rawQ, setRawQ] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounce(rawQ.trim(), 300);
  const { data, isLoading } = useVideoTracks(page, q || undefined);
  const videos = data?.data ?? [];
  const { playQueue } = usePlayerStore.getState();

  return (
    <div className="space-y-6 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Video size={26} className="text-brand-primary" /> Videos
        </h1>
        {videos.length > 0 && (
          <button
            onClick={() => playQueue(videos, 0)}
            className="inline-flex items-center gap-2 rounded-full bg-brand-primary px-5 py-2 text-sm font-semibold text-white hover:bg-brand-primary-light"
          >
            <Play size={16} /> Reproducir todo
          </button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={rawQ}
          onChange={(e) => { setRawQ(e.target.value); setPage(1); }}
          placeholder="Buscar videos…"
          className="w-full rounded-full border border-divider bg-chip py-2 pl-9 pr-4 outline-none focus:border-brand-secondary"
        />
      </div>

      {isLoading ? (
        <p className="text-muted">Cargando…</p>
      ) : videos.length === 0 ? (
        <p className="text-muted">No hay videos todavía. Subí uno desde <Link to="/upload" className="underline">Subir música</Link>.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {videos.map((_, i) => (
            <VideoCard key={videos[i]._id} videos={videos} index={i} />
          ))}
        </div>
      )}

      {data && data.pagination.lastPage > 1 && (
        <div className="flex items-center justify-between text-sm">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded px-3 py-1 hover:bg-main/10 disabled:opacity-40">← Anterior</button>
          <span className="text-muted">Página {page} de {data.pagination.lastPage}</span>
          <button disabled={page >= data.pagination.lastPage} onClick={() => setPage((p) => p + 1)} className="rounded px-3 py-1 hover:bg-main/10 disabled:opacity-40">Siguiente →</button>
        </div>
      )}
    </div>
  );
}
