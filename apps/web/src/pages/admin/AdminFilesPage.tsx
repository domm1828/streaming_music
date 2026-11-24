import { useState } from 'react';
import { Copy, Trash2 } from 'lucide-react';
import { useAdminFiles, useDeleteFile } from '../../features/admin/admin-platform-queries';

function fmtSize(bytes: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AdminFilesPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminFiles(page);
  const del = useDeleteFile();
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
      <h2 className="text-2xl font-bold">Archivos</h2>
      {isLoading ? (
        <p className="text-muted">Cargando…</p>
      ) : data && data.data.length === 0 ? (
        <p className="text-muted">No hay archivos subidos todavía.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {data?.data.map((f) => (
            <div key={f._id} className="overflow-hidden rounded-panel border border-divider">
              <div className="aspect-square bg-chip">
                {f.mime?.startsWith('image/') ? (
                  <img src={f.url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted">{f.mime ?? 'archivo'}</div>
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
