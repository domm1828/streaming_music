import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { Disc3, Music, Trash2, Upload, X } from 'lucide-react';
import { useGenres } from '../features/catalog/catalog-queries';
import { ArtistPicker } from '../features/catalog/ArtistPicker';
import { MultiArtistPicker, type ArtistRef } from '../features/catalog/MultiArtistPicker';
import { AlbumPicker, type AlbumRef } from '../features/catalog/AlbumPicker';
import {
  useCreateAlbum,
  useCreateTrack,
  useDeleteMyTrack,
  useMyTracks,
  useUploadTrackAudio,
} from '../features/creator/creator-queries';
import { MediaPickerDialog } from '../features/media/MediaPickerDialog';
import type { Genre } from '../features/catalog/types';

const field = 'w-full rounded-lg border border-divider bg-chip px-3 py-2 text-sm outline-none focus:border-brand-secondary';

function GenrePicker({ genres, selected, onToggle }: { genres: Genre[]; selected: string[]; onToggle: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {genres.map((g) => (
        <button
          key={g._id}
          type="button"
          onClick={() => onToggle(g._id)}
          className={`rounded-full px-2 py-0.5 text-xs transition ${selected.includes(g._id) ? 'bg-brand-primary text-white' : 'bg-chip text-muted hover:text-main'}`}
        >
          {g.displayName}
        </button>
      ))}
    </div>
  );
}

function CoverInput({ image, onChange, label = 'Carátula' }: { image: string | null; onChange: (url: string) => void; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="relative block h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-chip">
        {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center px-1 text-center text-[10px] text-muted">{label}</span>}
      </button>
      {open && (
        <MediaPickerDialog kind="image" scope="mine" title={`Seleccionar ${label.toLowerCase()}`} onSelect={({ url }) => onChange(url)} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function TrackCard({ file, genres, onRemove }: { file: File; genres: Genre[]; onRemove: () => void }) {
  const [name, setName] = useState(file.name.replace(/\.[^.]+$/, ''));
  const [artists, setArtists] = useState<ArtistRef[]>([]);
  const [album, setAlbum] = useState<AlbumRef | null>(null);
  const [genreIds, setGenreIds] = useState<string[]>([]);
  const [image, setImage] = useState<string | null>(null);
  const [status, setStatus] = useState<'ready' | 'saving' | 'done' | 'error'>('ready');
  const [trackId, setTrackId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createTrack = useCreateTrack();
  const uploadAudio = useUploadTrackAudio();

  const save = async () => {
    setStatus('saving');
    setError(null);
    try {
      const track = await createTrack.mutateAsync({
        name: name.trim() || file.name,
        artists: artists.length ? artists.map((a) => a.id) : undefined,
        album: album?.id,
        genres: genreIds.length ? genreIds : undefined,
        image: image ?? undefined,
      });
      await uploadAudio.mutateAsync({ id: track._id, file });
      setTrackId(track._id);
      setStatus('done');
    } catch (e) {
      setStatus('error');
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al subir');
    }
  };

  return (
    <div className="rounded-panel border border-divider p-4">
      <div className="flex items-start gap-4">
        <CoverInput image={image} onChange={setImage} />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Music size={16} className="shrink-0 text-muted" />
            <span className="truncate text-xs text-muted">{file.name}</span>
            <button onClick={onRemove} className="ml-auto text-muted hover:text-red-500"><X size={16} /></button>
          </div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre de la pista" className={field} />
          <MultiArtistPicker value={artists} onChange={setArtists} />
          <AlbumPicker value={album} onChange={setAlbum} />
          <GenrePicker genres={genres} selected={genreIds} onToggle={(id) => setGenreIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))} />
          {status === 'done' && trackId ? (
            <p className="text-sm text-brand-secondary">✓ Subida. <Link to={`/track/${trackId}`} className="underline">Ver pista</Link></p>
          ) : (
            <div className="flex items-center gap-3">
              <button onClick={save} disabled={status === 'saving'} className="inline-flex items-center gap-2 rounded-full bg-brand-primary px-5 py-2 text-sm font-semibold text-white hover:bg-brand-primary-light disabled:opacity-60">
                <Upload size={16} /> {status === 'saving' ? 'Subiendo…' : 'Subir'}
              </button>
              {error && <span className="text-sm text-red-500">{error}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AlbumForm({ files, genres, onClear }: { files: File[]; genres: Genre[]; onClear: () => void }) {
  const [name, setName] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [artist, setArtist] = useState<{ id: string; name: string } | null>(null);
  const [genreIds, setGenreIds] = useState<string[]>([]);
  const [image, setImage] = useState<string | null>(null);
  const [status, setStatus] = useState<'ready' | 'saving' | 'done' | 'error'>('ready');
  const [albumId, setAlbumId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const createAlbum = useCreateAlbum();
  const createTrack = useCreateTrack();
  const uploadAudio = useUploadTrackAudio();

  const create = async () => {
    if (!name.trim()) return setError('Poné un nombre al álbum.');
    setStatus('saving');
    setError(null);
    setProgress(0);
    try {
      const album = await createAlbum.mutateAsync({
        name: name.trim(),
        image: image ?? undefined,
        releaseDate: releaseDate || undefined,
        artists: artist ? [artist.id] : undefined,
        genres: genreIds.length ? genreIds : undefined,
      });
      let n = 0;
      for (const file of files) {
        const track = await createTrack.mutateAsync({
          name: file.name.replace(/\.[^.]+$/, ''),
          album: album._id,
          artists: artist ? [artist.id] : undefined,
          genres: genreIds.length ? genreIds : undefined,
          image: image ?? undefined,
        });
        await uploadAudio.mutateAsync({ id: track._id, file });
        setProgress(++n);
      }
      setAlbumId(album._id);
      setStatus('done');
    } catch (e) {
      setStatus('error');
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al crear el álbum');
    }
  };

  if (status === 'done' && albumId) {
    return (
      <div className="rounded-panel border border-divider p-6 text-sm text-brand-secondary">
        ✓ Álbum creado con {files.length} pistas. <Link to={`/album/${albumId}`} className="underline">Ver álbum</Link>
        <button onClick={onClear} className="ml-3 text-muted underline hover:text-main">Subir otro</button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-panel border border-divider p-4">
      <div className="flex items-start gap-4">
        <CoverInput image={image} onChange={setImage} label="Portada" />
        <div className="min-w-0 flex-1 space-y-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del álbum" className={field} />
          <div className="flex gap-2">
            <label className="flex-1 text-xs text-muted">
              Fecha de lanzamiento
              <input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} className={field} />
            </label>
          </div>
          <ArtistPicker value={artist} onChange={setArtist} />
          <GenrePicker genres={genres} selected={genreIds} onToggle={(id) => setGenreIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))} />
        </div>
      </div>
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Pistas ({files.length})</p>
        <ul className="space-y-1">
          {files.map((f, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-muted">
              <Music size={14} /> <span className="truncate">{f.name}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={create} disabled={status === 'saving' || files.length === 0} className="inline-flex items-center gap-2 rounded-full bg-brand-primary px-5 py-2 text-sm font-semibold text-white hover:bg-brand-primary-light disabled:opacity-60">
          <Disc3 size={16} /> {status === 'saving' ? `Subiendo ${progress}/${files.length}…` : 'Crear álbum'}
        </button>
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>
    </div>
  );
}

function MyTracks() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useMyTracks(page);
  const del = useDeleteMyTrack();
  if (isLoading) return <p className="text-muted">Cargando…</p>;
  if (data && data.data.length === 0) return <p className="text-muted">Todavía no subiste pistas.</p>;
  return (
    <div className="space-y-2">
      {data?.data.map((t) => (
        <div key={t._id} className="flex items-center gap-3 rounded-lg border border-divider px-3 py-2">
          {t.image ? <img src={t.image} alt="" className="h-10 w-10 rounded object-cover" /> : <div className="h-10 w-10 rounded bg-gradient-to-br from-brand-primary to-brand-secondary" />}
          <div className="min-w-0 flex-1">
            <Link to={`/track/${t._id}`} className="block truncate text-sm font-medium hover:underline">{t.name}</Link>
            <p className="truncate text-xs text-muted">{t.artists?.map((a) => a.artist.name).join(', ') || 'Sin artista'}</p>
          </div>
          <button onClick={() => confirm(`¿Eliminar "${t.name}"?`) && del.mutate(t._id)} className="rounded-full border border-divider p-2 text-muted hover:border-red-500 hover:text-red-500">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      {data && data.pagination.lastPage > 1 && (
        <div className="flex items-center justify-between pt-2 text-sm">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded px-3 py-1 hover:bg-main/10 disabled:opacity-40">← Anterior</button>
          <span className="text-muted">Página {page} de {data.pagination.lastPage}</span>
          <button disabled={page >= data.pagination.lastPage} onClick={() => setPage((p) => p + 1)} className="rounded px-3 py-1 hover:bg-main/10 disabled:opacity-40">Siguiente →</button>
        </div>
      )}
    </div>
  );
}

export function UploadPage() {
  const { data: genres } = useGenres();
  const [items, setItems] = useState<{ key: string; file: File }[]>([]);
  const [dragging, setDragging] = useState(false);
  const [albumMode, setAlbumMode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const audio = Array.from(files).filter((f) => f.type.startsWith('audio/'));
    setItems((s) => [...s, ...audio.map((file) => ({ key: `${file.name}-${Date.now()}-${Math.random()}`, file }))]);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Subir música</h1>
          <p className="mt-1 text-muted">Subí tus pistas o armá un álbum y publicá en el catálogo.</p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={albumMode} onChange={(e) => setAlbumMode(e.target.checked)} />
          Crear un álbum con los archivos
        </label>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        className={`flex flex-col items-center gap-3 rounded-panel border-2 border-dashed p-10 text-center transition ${dragging ? 'border-brand-secondary bg-brand-primary/5' : 'border-divider'}`}
      >
        <Upload size={32} className="text-muted" />
        <p className="text-sm text-muted">Arrastrá archivos de audio acá, o</p>
        <button onClick={() => inputRef.current?.click()} className="rounded-full bg-brand-primary px-5 py-2 text-sm font-semibold text-white hover:bg-brand-primary-light">Elegir archivos</button>
        <input ref={inputRef} type="file" accept="audio/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
      </div>

      {items.length > 0 && (
        albumMode ? (
          <AlbumForm files={items.map((i) => i.file)} genres={genres ?? []} onClear={() => setItems([])} />
        ) : (
          <div className="space-y-3">
            {items.map((it) => (
              <TrackCard key={it.key} file={it.file} genres={genres ?? []} onRemove={() => setItems((s) => s.filter((x) => x.key !== it.key))} />
            ))}
          </div>
        )
      )}

      <section>
        <h2 className="mb-3 text-xl font-semibold">Tus pistas</h2>
        <MyTracks />
      </section>
    </div>
  );
}
