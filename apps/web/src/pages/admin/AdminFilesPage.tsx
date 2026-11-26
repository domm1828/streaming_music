import { useState } from 'react';
import { Copy, Trash2, Upload } from 'lucide-react';
import { useDebounce } from '../../lib/use-debounce';
import { useMediaLibrary, useUploadMedia, useDeleteMedia, type MediaKind } from '../../features/media/media-queries';

function fmtSize(bytes: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const FILTERS: Array<{ value: MediaKind | 'all'; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'image', label: 'Imágenes' },
  { value: 'audio', label: 'Audio' },
  { value: 'video', label: 'Video' },
];

export function AdminFilesPage() {
  const [page, setPage] = useState(1);
  const [kind, setKind] = useState<MediaKind | 'all'>('all');
  const [rawQ, setRawQ] = useState('');
  const q = useDebounce(rawQ.trim(), 300);

  const { data, isLoading } = useMediaLibrary({ scope: 'all', kind: kind === 'all' ? undefined : kind, q: q || undefined, page });
  const upload = useUploadMedia();
  const del = useDeleteMedia();
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Archivos</h2>
        <label className="flex cursor-pointer items-center gap-2 rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:bg-brand-primary-light">
          <Upload size={15} />
          {upload.isPending ? 'Subiendo…' : 'Subir archivo'}
          <input
            type="file"
            accept="image/*,audio/*,video/*"
            className="hidden"
            disabled={upload.isPending}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload.mutate(f);
              e.target.value = '';
            }}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-full bg-chip p-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setKind(f.value); setPage(1); }}
              className={`rounded-full px-3 py-1 text-sm transition ${
                kind === f.value ? 'bg-brand-primary text-white' : 'text-muted hover:text-main'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          value={rawQ}
          onChange={(e) => { setRawQ(e.target.value); setPage(1); }}
          placeholder="Buscar por nombre…"
          className="min-w-[180px] flex-1 rounded-lg border border-divider bg-chip px-3 py-2 text-sm outline-none focus:border-brand-secondary"
        />
      </div>

      {isLoading ? (
        <p className="text-muted">Cargando…</p>
      ) : data && data.data.length === 0 ? (
        <p className="text-muted">No hay archivos para este filtro.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {data?.data.map((f) => (
            <div key={f._id} className="overflow-hidden rounded-panel border border-divider">
              <div className="aspect-square bg-chip">
                {f.kind === 'image' ? (
                  <img src={f.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs uppercase text-muted">{f.kind}</div>
                )}
              </div>
              <div className="p-2">
                <p className="truncate text-xs" title={f.filename}>{f.filename}</p>
                <p className="text-[10px] text-muted">{fmtSize(f.size)}</p>
                <div className="mt-1 flex gap-1">
                  <button onClick={() => copy(f.url, f._id)} className="flex-1 rounded border border-divider py-1 text-[10px] text-muted hover:text-main" title="Copiar URL">
                    {copied === f._id ? '¡Copiado!' : <Copy size={12} className="mx-auto" />}
                  </button>
                  <button
                    onClick={() => confirm('¿Eliminar archivo?') && del.mutate(f._id)}
                    className="rounded border border-divider px-2 py-1 text-[10px] text-muted hover:border-red-500 hover:text-red-500"
                    title="Eliminar"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {data && data.pagination.lastPage > 1 && (
        <div className="flex items-center justify-between text-sm">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded px-3 py-1 hover:bg-main/10 disabled:opacity-40">
            ← Anterior
          </button>
          <span className="text-muted">Página {page} de {data.pagination.lastPage}</span>
          <button disabled={page >= data.pagination.lastPage} onClick={() => setPage((p) => p + 1)} className="rounded px-3 py-1 hover:bg-main/10 disabled:opacity-40">
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}
