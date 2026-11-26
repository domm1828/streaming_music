import { useState } from 'react';
import { X } from 'lucide-react';
import { useDebounce } from '../../lib/use-debounce';
import { useArtists, useGenres } from '../catalog/catalog-queries';
import { useCreateAlbum, useUploadImage } from './catalog-admin-queries';

const field = 'w-full rounded-lg border border-divider bg-chip px-3 py-2 text-sm outline-none focus:border-brand-secondary';

interface Ref {
  _id: string;
  name: string;
}

/** Modal para crear un álbum nuevo (nombre + artistas + metadatos). */
export function AlbumCreateDialog({ onClose }: { onClose: () => void }) {
  const genresQuery = useGenres();
  const create = useCreateAlbum();
  const upload = useUploadImage();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [genreIds, setGenreIds] = useState<string[]>([]);
  const [artists, setArtists] = useState<Ref[]>([]);
  const [artQ, setArtQ] = useState('');
  const artResults = useArtists(useDebounce(artQ.trim(), 250) || undefined);

  const toggleGenre = (id: string) =>
    setGenreIds((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));

  const addArtist = (a: Ref) => {
    if (!artists.some((x) => x._id === a._id)) setArtists((p) => [...p, a]);
    setArtQ('');
  };

  const onSave = () => {
    create.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        releaseDate: releaseDate || undefined,
        image: image ?? undefined,
        artists: artists.map((a) => a._id),
        genres: genreIds,
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
          <h3 className="text-lg font-bold">Nuevo álbum</h3>
          <button onClick={onClose} className="rounded-full p-1 text-muted hover:bg-main/10 hover:text-main" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          {image ? (
            <img src={image} alt="" className="h-16 w-16 rounded object-cover" />
          ) : (
            <div className="h-16 w-16 rounded bg-chip" />
          )}
          <label className="cursor-pointer text-sm text-brand-secondary hover:underline">
            {upload.isPending ? 'Subiendo…' : 'Subir portada'}
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
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del álbum" className={field} />
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
          <p className="mt-1 text-xs text-muted">¿No está el artista? Crealo primero en la pestaña Artistas.</p>
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

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="rounded-full border border-divider px-4 py-2 text-sm text-muted hover:text-main">
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={create.isPending || !name.trim()}
            className="rounded-full bg-brand-primary px-5 py-2 text-sm font-semibold text-white hover:bg-brand-primary-light disabled:opacity-60"
          >
            {create.isPending ? 'Creando…' : 'Crear álbum'}
          </button>
        </div>
      </div>
    </div>
  );
}
