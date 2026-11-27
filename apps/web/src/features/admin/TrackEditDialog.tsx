import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useDebounce } from '../../lib/use-debounce';
import { useArtists, useGenres, useTags } from '../catalog/catalog-queries';
import {
  useAdminTrack,
  useAlbumSearch,
  useReplaceTrackAudio,
  useUpdateTrack,
} from './catalog-admin-queries';
import { MediaField } from '../media/MediaField';

const field = 'w-full rounded-lg border border-divider bg-chip px-3 py-2 text-sm outline-none focus:border-brand-secondary';

interface Ref {
  _id: string;
  name: string;
}

export function TrackEditDialog({ trackId, onClose }: { trackId: string; onClose: () => void }) {
  const { data, isLoading } = useAdminTrack(trackId);
  const genresQuery = useGenres();
  const tagsQuery = useTags();
  const update = useUpdateTrack();
  const replaceAudio = useReplaceTrackAudio(trackId);

  const [seeded, setSeeded] = useState(false);
  const [name, setName] = useState('');
  const [number, setNumber] = useState(1);
  const [image, setImage] = useState<string | null>(null);
  const [album, setAlbum] = useState<Ref | null>(null);
  const [genreIds, setGenreIds] = useState<string[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [artists, setArtists] = useState<Ref[]>([]);
  const [artQ, setArtQ] = useState('');
  const [albQ, setAlbQ] = useState('');
  const artResults = useArtists(useDebounce(artQ.trim(), 250) || undefined);
  const albResults = useAlbumSearch(useDebounce(albQ.trim(), 250));

  useEffect(() => {
    if (!data || seeded) return;
    setName(data.name);
    setNumber(data.number || 1);
    setImage(data.image);
    setAlbum(data.album ? { _id: data.album._id, name: data.album.name } : null);
    setGenreIds(data.genres.map((g) => g._id));
    setTagIds((data.tags ?? []).map((t) => t._id));
    setArtists(data.artists.map((a) => ({ _id: a.artist._id, name: a.artist.name })));
    setSeeded(true);
  }, [data, seeded]);

  const toggleGenre = (id: string) =>
    setGenreIds((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));

  const toggleTag = (id: string) =>
    setTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));

  const addArtist = (a: Ref) => {
    if (!artists.some((x) => x._id === a._id)) setArtists((p) => [...p, a]);
    setArtQ('');
  };

  const onSave = () => {
    update.mutate(
      {
        id: trackId,
        name: name.trim(),
        number,
        album: album?._id,
        artists: artists.map((a) => a._id),
        genres: genreIds,
        tags: tagIds,
        image: image ?? undefined,
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
          <h3 className="text-lg font-bold">Editar pista</h3>
          <button onClick={onClose} className="rounded-full p-1 text-muted hover:bg-main/10 hover:text-main" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        {isLoading || !data ? (
          <p className="text-muted">Cargando…</p>
        ) : (
          <>
            <MediaField
              value={image}
              onChange={setImage}
              label="Portada"
              promptSeed={`Portada para la pista musical «${name || data.name}»${
                artists.length ? ` de ${artists.map((a) => a.name).join(', ')}` : ''
              }, arte de tapa, sin texto`}
            />

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-muted">Nombre</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className={field} />
              </div>
              <div className="w-20">
                <label className="mb-1 block text-xs font-medium text-muted">N°</label>
                <input
                  type="number"
                  min={1}
                  value={number}
                  onChange={(e) => setNumber(Math.max(1, Number(e.target.value) || 1))}
                  className={field}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Álbum</label>
              {album ? (
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-chip px-3 py-1 text-sm">{album.name}</span>
                  <button type="button" onClick={() => setAlbum(null)} className="text-xs text-muted hover:text-red-500">
                    quitar
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input value={albQ} onChange={(e) => setAlbQ(e.target.value)} placeholder="Buscar álbum…" className={field} />
                  {albQ.trim() && albResults.data && albResults.data.data.length > 0 && (
                    <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-divider bg-elevated shadow-xl">
                      {albResults.data.data.map((a) => (
                        <li key={a._id}>
                          <button
                            type="button"
                            onClick={() => { setAlbum({ _id: a._id, name: a.name }); setAlbQ(''); }}
                            className="block w-full px-3 py-2 text-left text-sm hover:bg-main/10"
                          >
                            {a.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
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
              <label className="mb-1 block text-xs font-medium text-muted">Tags</label>
              <div className="flex flex-wrap gap-2">
                {tagsQuery.data?.map((t) => {
                  const on = tagIds.includes(t._id);
                  return (
                    <button
                      key={t._id}
                      type="button"
                      onClick={() => toggleTag(t._id)}
                      className={`rounded-full px-3 py-1 text-xs transition ${
                        on ? 'bg-brand-accent text-black' : 'border border-divider text-muted hover:border-brand-secondary'
                      }`}
                    >
                      {t.displayName}
                    </button>
                  );
                })}
                {tagsQuery.data && tagsQuery.data.length === 0 && (
                  <span className="text-xs text-muted">No hay tags. Creá tags en Administración → Tags.</span>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                Audio <span className="font-normal">· tipo actual: {data.srcType}</span>
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-divider px-3 py-2 text-sm hover:border-brand-secondary">
                {replaceAudio.isPending ? 'Subiendo…' : 'Reemplazar archivo de audio'}
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) replaceAudio.mutate(f);
                  }}
                />
              </label>
              {replaceAudio.isSuccess && <p className="mt-1 text-xs text-brand-secondary">Audio reemplazado.</p>}
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
