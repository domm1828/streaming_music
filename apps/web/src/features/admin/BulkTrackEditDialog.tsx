import { useState } from 'react';
import { X } from 'lucide-react';
import { useGenres, useTags } from '../catalog/catalog-queries';
import { MultiArtistPicker, type ArtistRef } from '../catalog/MultiArtistPicker';
import { AlbumPicker, type AlbumRef } from '../catalog/AlbumPicker';
import { MediaField } from '../media/MediaField';
import { useBulkUpdateTracks, type BulkUpdateTracksInput } from './catalog-admin-queries';

/** Encabezado de un campo con su checkbox "Aplicar". */
function FieldToggle({
  label,
  on,
  onToggle,
  hint,
  children,
}: {
  label: string;
  on: boolean;
  onToggle: (v: boolean) => void;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-divider p-3">
      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={on} onChange={(e) => onToggle(e.target.checked)} className="cursor-pointer" />
        Aplicar {label}
      </label>
      {on && (
        <div className="mt-3 space-y-2">
          {hint && <p className="text-xs text-muted">{hint}</p>}
          {children}
        </div>
      )}
    </div>
  );
}

export function BulkTrackEditDialog({
  trackIds,
  onClose,
  onDone,
}: {
  trackIds: string[];
  onClose: () => void;
  onDone: () => void;
}) {
  const genresQuery = useGenres();
  const tagsQuery = useTags();
  const bulk = useBulkUpdateTracks();

  const [applyAlbum, setApplyAlbum] = useState(false);
  const [album, setAlbum] = useState<AlbumRef | null>(null);
  const [applyArtists, setApplyArtists] = useState(false);
  const [artists, setArtists] = useState<ArtistRef[]>([]);
  const [applyGenres, setApplyGenres] = useState(false);
  const [genreIds, setGenreIds] = useState<string[]>([]);
  const [applyTags, setApplyTags] = useState(false);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [applyImage, setApplyImage] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<{ updated: number; skipped: number } | null>(null);

  const toggle = (set: React.Dispatch<React.SetStateAction<string[]>>) => (id: string) =>
    set((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const buildInput = (): BulkUpdateTracksInput => {
    const input: BulkUpdateTracksInput = { trackIds };
    if (applyAlbum && album) input.album = album.id;
    if (applyArtists) input.artists = artists.map((a) => a.id);
    if (applyGenres) input.genres = genreIds;
    if (applyTags) input.tags = tagIds;
    if (applyImage && image) input.image = image;
    return input;
  };

  const input = buildInput();
  const fieldCount = Object.keys(input).length - 1; // sin contar trackIds
  const canSave = fieldCount > 0 && !bulk.isPending;

  const onSave = () => {
    bulk.mutate(buildInput(), {
      onSuccess: (res) => setResult(res),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/50 p-4" onClick={onClose}>
      <div
        className="mt-10 w-full max-w-lg space-y-4 rounded-panel border border-divider bg-elevated p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Editar {trackIds.length} pistas en lote</h3>
          <button onClick={onClose} className="rounded-full p-1 text-muted hover:bg-main/10 hover:text-main" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        {result ? (
          <div className="space-y-4">
            <p className="text-sm">
              ✓ Actualizadas: <strong>{result.updated}</strong>
              {result.skipped > 0 && (
                <> · Saltadas (sin permiso o inexistentes): <strong>{result.skipped}</strong></>
              )}
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => { onDone(); }}
                className="rounded-full bg-brand-primary px-5 py-2 text-sm font-semibold text-white hover:bg-brand-primary-light"
              >
                Listo
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted">
              Marcá solo los campos que querés aplicar; lo que no marques no se toca. Artistas, géneros y tags
              reemplazan lo que tengan las pistas.
            </p>

            <FieldToggle label="álbum" on={applyAlbum} onToggle={setApplyAlbum} hint="Elegí un álbum para asignarlo a todas.">
              <AlbumPicker value={album} onChange={setAlbum} />
            </FieldToggle>

            <FieldToggle label="artistas" on={applyArtists} onToggle={setApplyArtists} hint="Sin artistas = se quitan de todas.">
              <MultiArtistPicker value={artists} onChange={setArtists} />
            </FieldToggle>

            <FieldToggle label="géneros" on={applyGenres} onToggle={setApplyGenres}>
              <div className="flex flex-wrap gap-2">
                {genresQuery.data?.map((g) => {
                  const on = genreIds.includes(g._id);
                  return (
                    <button
                      key={g._id}
                      type="button"
                      onClick={() => toggle(setGenreIds)(g._id)}
                      className={`rounded-full px-3 py-1 text-xs transition ${
                        on ? 'bg-brand-primary text-white' : 'border border-divider text-muted hover:border-brand-secondary'
                      }`}
                    >
                      {g.displayName}
                    </button>
                  );
                })}
              </div>
            </FieldToggle>

            <FieldToggle label="tags" on={applyTags} onToggle={setApplyTags}>
              <div className="flex flex-wrap gap-2">
                {tagsQuery.data?.map((t) => {
                  const on = tagIds.includes(t._id);
                  return (
                    <button
                      key={t._id}
                      type="button"
                      onClick={() => toggle(setTagIds)(t._id)}
                      className={`rounded-full px-3 py-1 text-xs transition ${
                        on ? 'bg-brand-accent text-black' : 'border border-divider text-muted hover:border-brand-secondary'
                      }`}
                    >
                      {t.displayName}
                    </button>
                  );
                })}
                {tagsQuery.data && tagsQuery.data.length === 0 && (
                  <span className="text-xs text-muted">No hay tags.</span>
                )}
              </div>
            </FieldToggle>

            <FieldToggle label="portada" on={applyImage} onToggle={setApplyImage}>
              <MediaField value={image} onChange={setImage} label="Portada" />
            </FieldToggle>

            {bulk.isError && <p className="text-sm text-red-500">No se pudo aplicar. Intentá de nuevo.</p>}

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted">{fieldCount} campo(s) a aplicar</span>
              <div className="flex gap-2">
                <button onClick={onClose} className="rounded-full border border-divider px-4 py-2 text-sm text-muted hover:text-main">
                  Cancelar
                </button>
                <button
                  onClick={onSave}
                  disabled={!canSave}
                  className="rounded-full bg-brand-primary px-5 py-2 text-sm font-semibold text-white hover:bg-brand-primary-light disabled:opacity-60"
                >
                  {bulk.isPending ? 'Aplicando…' : `Aplicar a ${trackIds.length}`}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
