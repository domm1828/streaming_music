import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { useDebounce } from '../../lib/use-debounce';
import { useArtists, useGenres } from '../catalog/catalog-queries';
import {
  useAdminAlbum,
  useRemoveAlbumTrack,
  useReorderAlbumTracks,
  useUpdateAlbum,
  useUploadImage,
} from './catalog-admin-queries';

const field = 'w-full rounded-lg border border-divider bg-chip px-3 py-2 text-sm outline-none focus:border-brand-secondary';

interface Ref {
  _id: string;
  name: string;
}

export function AlbumEditDialog({ albumId, onClose }: { albumId: string; onClose: () => void }) {
  const { data, isLoading } = useAdminAlbum(albumId);
  const genresQuery = useGenres();
  const update = useUpdateAlbum();
  const upload = useUploadImage();
  const reorder = useReorderAlbumTracks(albumId);
  const removeTrack = useRemoveAlbumTrack(albumId);

  const [seeded, setSeeded] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [genreIds, setGenreIds] = useState<string[]>([]);
  const [artists, setArtists] = useState<Ref[]>([]);
  const [artQ, setArtQ] = useState('');
  const artResults = useArtists(useDebounce(artQ.trim(), 250) || undefined);

  useEffect(() => {
    if (!data || seeded) return;
    setName(data.name);
    setDescription(data.description ?? '');
    setReleaseDate(data.releaseDate ? data.releaseDate.slice(0, 10) : '');
    setImage(data.image);
    setGenreIds(data.genres.map((g) => g._id));
    setArtists(data.artists.map((a) => ({ _id: a._id, name: a.name })));
    setSeeded(true);
  }, [data, seeded]);

  const toggleGenre = (id: string) =>
    setGenreIds((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));

  const addArtist = (a: Ref) => {
    if (!artists.some((x) => x._id === a._id)) setArtists((p) => [...p, a]);
    setArtQ('');
  };

  const tracks = data?.tracks ?? [];
  const moveTrack = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= tracks.length) return;
    const ids = tracks.map((t) => t._id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorder.mutate(ids);
  };

  const onSave = () => {
    update.mutate(
      {
        id: albumId,
        name: name.trim(),
        description: description.trim(),
        releaseDate: releaseDate || undefined,
        image: image ?? undefined,
        genres: genreIds,
        artists: artists.map((a) => a._id),
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
          <h3 className="text-lg font-bold">Editar álbum</h3>
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
                <img src={image} alt="" className="h-16 w-16 rounded object-cover" />
              ) : (
                <div className="h-16 w-16 rounded bg-chip" />
              )}
              <label className="cursor-pointer text-sm text-brand-secondary hover:underline">
                {upload.isPending ? 'Subiendo…' : 'Cambiar portada'}
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
              <label className="mb-1 block text-xs font-medium text-muted">Fecha de lanzamiento</label>
              <input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} className={field} />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Descripción</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={field} />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Artistas</label>
              {artists.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {artists.map((a) => (
                    <span key={a._id} className="flex items-center gap-1 rounded-full bg-chip px-3 py-1 text-xs">
                      {a.name}
                      <button
                        type="button"
                        onClick={() => setArtists((p) => p.filter((x) => x._id !== a._id))}
                        className="text-muted hover:text-red-500"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="relative">
                <input value={artQ} onChange={(e) => setArtQ(e.target.value)} placeholder="Buscar artista…" className={field} />
                {artQ.trim() && artResults.data && artResults.data.data.length > 0 && (
                  <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-divider bg-elevated shadow-xl">
                    {artResults.data.data
                      .filter((a) => !artists.some((x) => x._id === a._id))
                      .map((a) => (
                        <li key={a._id}>
                          <button
                            type="button"
                            onClick={() => addArtist({ _id: a._id, name: a.name })}
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
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Pistas del álbum ({tracks.length})</label>
              <ul className="space-y-1">
                {tracks.map((t, i) => (
                  <li key={t._id} className="flex items-center gap-2 rounded-lg bg-chip px-3 py-2">
                    <span className="w-5 text-right text-xs tabular-nums text-muted">{t.number || i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{t.name}</p>
                      <p className="truncate text-xs text-muted">{t.artists?.map((a) => a.artist.name).join(', ')}</p>
                    </div>
                    <button
                      onClick={() => moveTrack(i, -1)}
                      disabled={i === 0 || reorder.isPending}
                      className="rounded p-1 text-muted hover:text-main disabled:opacity-30"
                      aria-label="Subir"
                    >
                      <ChevronUp size={15} />
                    </button>
                    <button
                      onClick={() => moveTrack(i, 1)}
                      disabled={i === tracks.length - 1 || reorder.isPending}
                      className="rounded p-1 text-muted hover:text-main disabled:opacity-30"
                      aria-label="Bajar"
                    >
                      <ChevronDown size={15} />
                    </button>
                    <button
                      onClick={() => confirm('¿Quitar esta pista del álbum?') && removeTrack.mutate(t._id)}
                      className="rounded p-1 text-muted hover:text-red-500"
                      aria-label="Quitar del álbum"
                    >
                      <X size={15} />
                    </button>
                  </li>
                ))}
                {tracks.length === 0 && <li className="text-xs text-muted">El álbum no tiene pistas.</li>}
              </ul>
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
