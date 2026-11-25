import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useDebounce } from '../../lib/use-debounce';
import { useArtists, useGenres } from '../catalog/catalog-queries';
import { useAdminArtist, useUpdateArtist, useUploadImage } from './catalog-admin-queries';

const field = 'w-full rounded-lg border border-divider bg-chip px-3 py-2 text-sm outline-none focus:border-brand-secondary';

interface Ref {
  _id: string;
  name: string;
}

export function ArtistEditDialog({ artistId, onClose }: { artistId: string; onClose: () => void }) {
  const { data, isLoading } = useAdminArtist(artistId);
  const genresQuery = useGenres();
  const update = useUpdateArtist();
  const upload = useUploadImage();

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [verified, setVerified] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [genreIds, setGenreIds] = useState<string[]>([]);
  const [similar, setSimilar] = useState<Ref[]>([]);
  const [simQ, setSimQ] = useState('');
  const simResults = useArtists(useDebounce(simQ.trim(), 250) || undefined);

  useEffect(() => {
    if (!data) return;
    setName(data.name);
    setBio(data.bio ?? '');
    setVerified(data.verified);
    setImage(data.image);
    setGenreIds(data.genres.map((g) => g._id));
    setSimilar(data.similar.map((s) => ({ _id: s._id, name: s.name })));
  }, [data]);

  const toggleGenre = (id: string) =>
    setGenreIds((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));

  const addSimilar = (a: Ref) => {
    if (!similar.some((s) => s._id === a._id) && a._id !== artistId) setSimilar((p) => [...p, a]);
    setSimQ('');
  };

  const onSave = () => {
    update.mutate(
      {
        id: artistId,
        name: name.trim(),
        bio: bio.trim(),
        verified,
        image: image ?? undefined,
        genres: genreIds,
        similar: similar.map((s) => s._id),
      },
      { onSuccess: onClose },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/50 p-4" onClick={onClose}>
      <div
        className="mt-10 w-full max-w-lg space-y-4 rounded-panel border border-divider bg-elevated p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Editar artista</h3>
          <button onClick={onClose} className="rounded-full p-1 text-muted hover:bg-main/10 hover:text-main" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        {isLoading || !data ? (
          <p className="text-muted">Cargando…</p>
        ) : (
          <>
            <div className="flex items-center gap-3">
              {image ? (
                <img src={image} alt="" className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <div className="h-16 w-16 rounded-full bg-chip" />
              )}
              <label className="cursor-pointer text-sm text-brand-secondary hover:underline">
                {upload.isPending ? 'Subiendo…' : 'Cambiar imagen'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) upload.mutate(f, { onSuccess: (url) => setImage(url) });
                  }}
                />
              </label>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Nombre</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={field} />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Slug</label>
              <input value={data.slug} readOnly className={`${field} opacity-60`} />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Biografía</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} className={field} />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} /> Verificado
            </label>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Géneros</label>
              <div className="flex flex-wrap gap-2">
                {genresQuery.data?.map((g) => {
                  const on = genreIds.includes(g._id);
                  return (
                    <button
                      key={g._id}
                      type="button"
                      onClick={() => toggleGenre(g._id)}
                      className={`rounded-full px-3 py-1 text-xs transition ${
                        on ? 'bg-brand-primary text-white' : 'border border-divider text-muted hover:border-brand-secondary'
                      }`}
                    >
                      {g.displayName}
                    </button>
                  );
                })}
                {genresQuery.data && genresQuery.data.length === 0 && (
                  <span className="text-xs text-muted">No hay géneros cargados.</span>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Artistas similares</label>
              {similar.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {similar.map((s) => (
                    <span key={s._id} className="flex items-center gap-1 rounded-full bg-chip px-3 py-1 text-xs">
                      {s.name}
                      <button
                        type="button"
                        onClick={() => setSimilar((p) => p.filter((x) => x._id !== s._id))}
                        className="text-muted hover:text-red-500"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="relative">
                <input
                  value={simQ}
                  onChange={(e) => setSimQ(e.target.value)}
                  placeholder="Buscar artista…"
                  className={field}
                />
                {simQ.trim() && simResults.data && simResults.data.data.length > 0 && (
                  <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-divider bg-elevated shadow-xl">
                    {simResults.data.data
                      .filter((a) => a._id !== artistId && !similar.some((s) => s._id === a._id))
                      .map((a) => (
                        <li key={a._id}>
                          <button
                            type="button"
                            onClick={() => addSimilar({ _id: a._id, name: a.name })}
                            className="block w-full px-3 py-2 text-left text-sm hover:bg-main/10"
                          >
                            {a.name}
                          </button>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={onClose} className="rounded-full border border-divider px-4 py-2 text-sm text-muted hover:text-main">
                Cancelar
              </button>
              <button
                onClick={onSave}
                disabled={update.isPending || !name.trim()}
                className="rounded-full bg-brand-primary px-5 py-2 text-sm font-semibold text-white hover:bg-brand-primary-light disabled:opacity-60"
              >
                {update.isPending ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
