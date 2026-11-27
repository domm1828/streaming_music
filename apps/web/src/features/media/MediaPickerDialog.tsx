import { useState } from 'react';
import { X, Upload, Search, Check, Sparkles } from 'lucide-react';
import { useDebounce } from '../../lib/use-debounce';
import {
  useGenerateImage,
  useMediaLibrary,
  useUploadMedia,
  type MediaEntry,
  type MediaKind,
  type MediaScope,
} from './media-queries';

const ACCEPT: Record<MediaKind, string> = {
  image: 'image/*',
  audio: 'audio/*',
  video: 'video/*',
  other: '*/*',
};

function fmtSize(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  kind?: MediaKind;
  scope?: MediaScope;
  title?: string;
  /** Prompt inicial para la pestaña "Generar con IA" (ej. el nombre de la entidad). */
  promptSeed?: string;
  onSelect: (entry: { url: string; id: string }) => void;
  onClose: () => void;
}

/** Modal para subir, elegir de la biblioteca o generar con IA un medio. */
export function MediaPickerDialog({ kind = 'image', scope = 'all', title, promptSeed, onSelect, onClose }: Props) {
  const [tab, setTab] = useState<'upload' | 'library' | 'generate'>('library');
  const [rawQ, setRawQ] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounce(rawQ.trim(), 300);
  const canGenerate = kind === 'image';

  const upload = useUploadMedia();
  const library = useMediaLibrary({ scope, kind, q: q || undefined, page, enabled: tab === 'library' });

  const pick = (e: MediaEntry) => {
    onSelect({ url: e.url, id: e._id });
    onClose();
  };

  const onFile = (file: File | undefined) => {
    if (!file) return;
    upload.mutate(file, { onSuccess: (r) => { onSelect({ url: r.url, id: r.id }); onClose(); } });
  };

  const tabClass = (active: boolean) =>
    `flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition ${
      active ? 'bg-brand-primary text-white' : 'text-muted hover:text-main'
    }`;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-auto bg-black/60 p-4" onClick={onClose}>
      <div
        className="mt-10 w-full max-w-2xl space-y-4 rounded-panel border border-divider bg-elevated p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{title ?? 'Seleccionar medio'}</h3>
          <button onClick={onClose} className="rounded-full p-1 text-muted hover:bg-main/10 hover:text-main" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-1 rounded-full bg-chip p-1">
          <button className={tabClass(tab === 'library')} onClick={() => setTab('library')}>
            <Search size={15} /> Biblioteca
          </button>
          <button className={tabClass(tab === 'upload')} onClick={() => setTab('upload')}>
            <Upload size={15} /> Subir
          </button>
          {canGenerate && (
            <button className={tabClass(tab === 'generate')} onClick={() => setTab('generate')}>
              <Sparkles size={15} /> Generar con IA
            </button>
          )}
        </div>

        {tab === 'generate' ? (
          <GenerateTab
            promptSeed={promptSeed}
            onUse={(r) => { onSelect({ url: r.url, id: r.id }); onClose(); }}
          />
        ) : tab === 'upload' ? (
          <label className="flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-3 rounded-panel border-2 border-dashed border-divider bg-chip/40 p-8 text-center hover:border-brand-secondary">
            <Upload size={28} className="text-muted" />
            <span className="text-sm font-medium">{upload.isPending ? 'Subiendo…' : 'Elegí un archivo o arrastralo acá'}</span>
            <span className="text-xs text-muted">
              {kind === 'image' ? 'JPG, PNG, WEBP, GIF, AVIF' : kind === 'audio' ? 'MP3, M4A, OGG, WAV, FLAC' : kind === 'video' ? 'MP4, WEBM, MOV' : 'Cualquier medio'}
            </span>
            <input
              type="file"
              accept={ACCEPT[kind]}
              className="hidden"
              disabled={upload.isPending}
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            {upload.isError && <span className="text-xs text-red-500">No se pudo subir. Revisá tipo y tamaño.</span>}
          </label>
        ) : (
          <>
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={rawQ}
                onChange={(e) => { setRawQ(e.target.value); setPage(1); }}
                placeholder="Buscar por nombre de archivo…"
                className="w-full rounded-lg border border-divider bg-chip py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-secondary"
              />
            </div>

            {library.isLoading ? (
              <p className="py-8 text-center text-muted">Cargando…</p>
            ) : library.data && library.data.data.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">
                No hay medios todavía. Usá la pestaña <strong>Subir</strong>.
              </p>
            ) : (
              <div className="grid max-h-[50vh] grid-cols-3 gap-2 overflow-auto sm:grid-cols-4 md:grid-cols-5">
                {library.data?.data.map((f) => (
                  <button
                    key={f._id}
                    type="button"
                    onClick={() => pick(f)}
                    className="group relative overflow-hidden rounded-lg border border-divider hover:border-brand-secondary"
                    title={f.filename}
                  >
                    <div className="aspect-square bg-chip">
                      {f.kind === 'image' ? (
                        <img src={f.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] uppercase text-muted">{f.kind}</div>
                      )}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-brand-primary/0 opacity-0 transition group-hover:bg-brand-primary/20 group-hover:opacity-100">
                      <Check size={22} className="text-white drop-shadow" />
                    </div>
                    <span className="block truncate px-1 py-0.5 text-[9px] text-muted">{fmtSize(f.size)}</span>
                  </button>
                ))}
              </div>
            )}

            {library.data && library.data.pagination.lastPage > 1 && (
              <div className="flex items-center justify-between text-sm">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded px-3 py-1 hover:bg-main/10 disabled:opacity-40">
                  ← Anterior
                </button>
                <span className="text-muted">Página {page} de {library.data.pagination.lastPage}</span>
                <button
                  disabled={page >= library.data.pagination.lastPage}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded px-3 py-1 hover:bg-main/10 disabled:opacity-40"
                >
                  Siguiente →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const SIZES = [
  { label: 'Cuadrada', w: 1024, h: 1024 },
  { label: 'Panorámica', w: 1280, h: 720 },
  { label: 'Retrato', w: 768, h: 1024 },
] as const;

/** Pestaña de generación con IA: prompt editable, tamaño y preview antes de usar. */
function GenerateTab({
  promptSeed,
  onUse,
}: {
  promptSeed?: string;
  onUse: (r: { url: string; id: string }) => void;
}) {
  const [prompt, setPrompt] = useState(promptSeed ?? '');
  const [sizeIdx, setSizeIdx] = useState(0);
  const [generated, setGenerated] = useState<{ url: string; id: string } | null>(null);
  const gen = useGenerateImage();
  const size = SIZES[sizeIdx];

  const generate = () => {
    const p = prompt.trim();
    if (p.length < 3) return;
    setGenerated(null);
    gen.mutate(
      { prompt: p, width: size.w, height: size.h },
      { onSuccess: (r) => setGenerated({ url: r.url, id: r.id }) },
    );
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted">Descripción (prompt)</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          placeholder="Ej: portada de álbum de jazz, atardecer sobre la ciudad, estilo acuarela, sin texto"
          className="w-full resize-none rounded-lg border border-divider bg-chip px-3 py-2 text-sm outline-none focus:border-brand-secondary"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">Tamaño:</span>
        {SIZES.map((s, i) => (
          <button
            key={s.label}
            type="button"
            onClick={() => setSizeIdx(i)}
            className={`rounded-full px-3 py-1 text-xs transition ${
              i === sizeIdx ? 'bg-brand-primary text-white' : 'border border-divider text-muted hover:border-brand-secondary'
            }`}
          >
            {s.label} · {s.w}×{s.h}
          </button>
        ))}
      </div>

      {generated ? (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-panel border border-divider">
            <img src={generated.url} alt="Imagen generada" className="mx-auto max-h-[40vh] w-auto object-contain" />
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={generate}
              disabled={gen.isPending}
              className="rounded-full border border-divider px-4 py-2 text-sm text-muted hover:border-brand-secondary hover:text-main disabled:opacity-60"
            >
              {gen.isPending ? 'Generando…' : 'Regenerar'}
            </button>
            <button
              type="button"
              onClick={() => onUse(generated)}
              className="rounded-full bg-brand-primary px-5 py-2 text-sm font-semibold text-white hover:bg-brand-primary-light"
            >
              Usar esta imagen
            </button>
          </div>
        </div>
      ) : (
        <div className="flex min-h-[160px] flex-col items-center justify-center gap-3 rounded-panel border-2 border-dashed border-divider bg-chip/40 p-6 text-center">
          <Sparkles size={26} className="text-muted" />
          <p className="text-xs text-muted">
            {gen.isPending ? 'Generando imagen… puede tardar unos segundos.' : 'Escribí una descripción y generá la imagen.'}
          </p>
          <button
            type="button"
            onClick={generate}
            disabled={gen.isPending || prompt.trim().length < 3}
            className="rounded-full bg-brand-primary px-5 py-2 text-sm font-semibold text-white hover:bg-brand-primary-light disabled:opacity-60"
          >
            {gen.isPending ? 'Generando…' : 'Generar'}
          </button>
          {gen.isError && <span className="text-xs text-red-500">No se pudo generar. Probá de nuevo o cambiá el prompt.</span>}
        </div>
      )}
    </div>
  );
}
