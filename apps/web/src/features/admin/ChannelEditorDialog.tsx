import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { useDebounce } from '../../lib/use-debounce';
import { useGenres } from '../catalog/catalog-queries';
import { useSearchType } from '../discovery/discovery-queries';
import type { SearchableType } from '../discovery/types';
import {
  useChannelResolved,
  useCreateChannel,
  useUpdateChannel,
  type AdminChannel,
  type ChannelContentItem,
  type ChannelLayout,
  type ChannelSourceType,
} from './catalog-admin-queries';

const field = 'w-full rounded-lg border border-divider bg-chip px-3 py-2 text-sm outline-none focus:border-brand-secondary';

const SOURCES: { value: ChannelSourceType; label: string }[] = [
  { value: 'topTracks', label: 'Pistas más escuchadas' },
  { value: 'newAlbums', label: 'Álbumes nuevos' },
  { value: 'topArtists', label: 'Artistas populares' },
  { value: 'genreTracks', label: 'Pistas por género' },
  { value: 'publicPlaylists', label: 'Playlists públicas' },
  { value: 'manual', label: 'Manual (contenido elegido)' },
];
const LAYOUTS: ChannelLayout[] = ['grid', 'carousel', 'list'];
const CONTENT_TYPES: ChannelContentItem['refType'][] = ['track', 'album', 'artist', 'playlist'];

interface ContentRow extends ChannelContentItem {
  name: string;
}

export function ChannelEditorDialog({ channel, onClose }: { channel: AdminChannel | null; onClose: () => void }) {
  const isEdit = Boolean(channel);
  const genresQuery = useGenres();
  const create = useCreateChannel();
  const update = useUpdateChannel();

  const [name, setName] = useState(channel?.name ?? '');
  const [type, setType] = useState(channel?.type ?? 'home');
  const [sourceType, setSourceType] = useState<ChannelSourceType>(channel?.config.sourceType ?? 'topTracks');
  const [layout, setLayout] = useState<ChannelLayout>(channel?.config.layout ?? 'grid');
  const [limit, setLimit] = useState<number>(channel?.config.params?.limit ?? 12);
  const [genre, setGenre] = useState<string>(channel?.config.params?.genre ?? '');
  const [position, setPosition] = useState<number>(channel?.position ?? 0);
  const [isPublic, setIsPublic] = useState<boolean>(channel?.public ?? true);
  const [internal, setInternal] = useState<boolean>(channel?.internal ?? false);
  const [content, setContent] = useState<ContentRow[]>([]);
  const [seededContent, setSeededContent] = useState(false);

  // Contenido manual existente: se resuelve con nombres desde el endpoint público.
  const resolved = useChannelResolved(channel?.slug ?? null, isEdit && sourceType === 'manual');
  useEffect(() => {
    if (seededContent || !resolved.data) return;
    setContent(
      resolved.data.items.map((it, i) => ({
        refType: (it._itemType as ChannelContentItem['refType']) ?? 'track',
        refId: it._id,
        order: i,
        name: it.name,
      })),
    );
    setSeededContent(true);
  }, [resolved.data, seededContent]);

  const [cType, setCType] = useState<ChannelContentItem['refType']>('track');
  const [cQ, setCQ] = useState('');
  const results = useSearchType<{ _id: string; name: string }>(useDebounce(cQ.trim(), 250), cType as SearchableType, 1);

  const addContent = (item: { _id: string; name: string }) => {
    if (!content.some((c) => c.refId === item._id && c.refType === cType)) {
      setContent((p) => [...p, { refType: cType, refId: item._id, order: p.length, name: item.name }]);
    }
    setCQ('');
  };
  const moveContent = (i: number, dir: -1 | 1) => {
    const t = i + dir;
    if (t < 0 || t >= content.length) return;
    setContent((p) => {
      const next = [...p];
      [next[i], next[t]] = [next[t], next[i]];
      return next;
    });
  };

  const onSave = () => {
    const params: Record<string, unknown> = { limit };
    if (sourceType === 'genreTracks' && genre) params.genre = genre;
    const payload = {
      name: name.trim(),
      type: type.trim() || 'home',
      position,
      public: isPublic,
      internal,
      config: { sourceType, layout, params },
      content:
        sourceType === 'manual'
          ? content.map((c, i) => ({ refType: c.refType, refId: c.refId, order: i }))
          : [],
    };
    if (channel) {
      update.mutate({ id: channel._id, ...payload }, { onSuccess: onClose });
    } else {
      create.mutate(payload, { onSuccess: onClose });
    }
  };

  const pending = create.isPending || update.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/50 p-4" onClick={onClose}>
      <div
        className="mt-10 w-full max-w-lg space-y-4 rounded-panel border border-divider bg-elevated p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{isEdit ? 'Editar channel' : 'Nuevo channel'}</h3>
          <button onClick={onClose} className="rounded-full p-1 text-muted hover:bg-main/10 hover:text-main" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-muted">Nombre</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={field} />
          </div>
          <div className="w-28">
            <label className="mb-1 block text-xs font-medium text-muted">Página</label>
            <input value={type} onChange={(e) => setType(e.target.value)} placeholder="home" className={field} />
          </div>
        </div>

        {isEdit && channel && <p className="text-xs text-muted">Slug: {channel.slug}</p>}

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-muted">Fuente</label>
            <select value={sourceType} onChange={(e) => setSourceType(e.target.value as ChannelSourceType)} className={field}>
              {SOURCES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="w-32">
            <label className="mb-1 block text-xs font-medium text-muted">Layout</label>
            <select value={layout} onChange={(e) => setLayout(e.target.value as ChannelLayout)} className={field}>
              {LAYOUTS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>

        {sourceType === 'genreTracks' && (
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Género</label>
            <select value={genre} onChange={(e) => setGenre(e.target.value)} className={field}>
              <option value="">— elegir —</option>
              {genresQuery.data?.map((g) => (
                <option key={g._id} value={g._id}>
                  {g.displayName}
                </option>
              ))}
            </select>
          </div>
        )}

        {sourceType === 'manual' ? (
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Contenido ({content.length})</label>
            {content.length > 0 && (
              <ul className="mb-2 space-y-1">
                {content.map((c, i) => (
                  <li key={`${c.refType}:${c.refId}`} className="flex items-center gap-2 rounded-lg bg-chip px-3 py-1.5">
                    <span className="rounded bg-main/10 px-1.5 py-0.5 text-[10px] uppercase text-muted">{c.refType}</span>
                    <span className="min-w-0 flex-1 truncate text-sm">{c.name}</span>
                    <button onClick={() => moveContent(i, -1)} disabled={i === 0} className="rounded p-1 text-muted hover:text-main disabled:opacity-30" aria-label="Subir">
                      <ChevronUp size={14} />
                    </button>
                    <button onClick={() => moveContent(i, 1)} disabled={i === content.length - 1} className="rounded p-1 text-muted hover:text-main disabled:opacity-30" aria-label="Bajar">
                      <ChevronDown size={14} />
                    </button>
                    <button onClick={() => setContent((p) => p.filter((x) => !(x.refId === c.refId && x.refType === c.refType)))} className="rounded p-1 text-muted hover:text-red-500" aria-label="Quitar">
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <select value={cType} onChange={(e) => setCType(e.target.value as ChannelContentItem['refType'])} className="w-28 rounded-lg border border-divider bg-chip px-2 py-2 text-sm">
                {CONTENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <div className="relative flex-1">
                <input value={cQ} onChange={(e) => setCQ(e.target.value)} placeholder="Buscar…" className={field} />
                {cQ.trim() && results.data && results.data.data.length > 0 && (
                  <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-divider bg-elevated shadow-xl">
                    {results.data.data.map((it) => (
                      <li key={it._id}>
                        <button type="button" onClick={() => addContent(it)} className="block w-full px-3 py-2 text-left text-sm hover:bg-main/10">
                          {it.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="w-32">
            <label className="mb-1 block text-xs font-medium text-muted">Cantidad</label>
            <input type="number" min={1} max={50} value={limit} onChange={(e) => setLimit(Math.min(50, Math.max(1, Number(e.target.value) || 1)))} className={field} />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <div className="w-24">
            <label className="mb-1 block text-xs font-medium text-muted">Orden</label>
            <input type="number" value={position} onChange={(e) => setPosition(Number(e.target.value) || 0)} className={field} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} /> Público
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> Interno
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="rounded-full border border-divider px-4 py-2 text-sm text-muted hover:text-main">
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={pending || !name.trim()}
            className="rounded-full bg-brand-primary px-5 py-2 text-sm font-semibold text-white hover:bg-brand-primary-light disabled:opacity-60"
          >
            {pending ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
