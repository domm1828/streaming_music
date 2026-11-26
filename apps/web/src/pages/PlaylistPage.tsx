import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ChevronDown, ChevronUp, ImagePlus, Plus, X } from 'lucide-react';
import { TrackList } from '../features/catalog/TrackList';
import { MediaHeader, PlayButton, SectionHeader, pillClass } from '../components/media';
import { FollowButton } from '../features/social/FollowButton';
import { ShareButton } from '../features/social/ShareButton';
import {
  useAddTracks,
  useDeletePlaylist,
  usePlaylist,
  useRemoveTrack,
  useReorderTracks,
  useUpdatePlaylist,
} from '../features/playlists/playlist-queries';
import { MediaPickerDialog } from '../features/media/MediaPickerDialog';
import { useSearchType } from '../features/discovery/discovery-queries';
import { useDebounce } from '../lib/use-debounce';
import { usePlayerStore } from '../features/player/player-store';
import type { Track } from '../features/catalog/types';

export function PlaylistPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError } = usePlaylist(id);
  const { playQueue } = usePlayerStore.getState();
  const reorder = useReorderTracks(id);
  const removeTrack = useRemoveTrack(id);
  const update = useUpdatePlaylist(id);
  const addTracks = useAddTracks(id);
  const del = useDeletePlaylist();
  const [editing, setEditing] = useState(false);
  const [showCover, setShowCover] = useState(false);
  const [q, setQ] = useState('');
  const search = useSearchType<Track>(useDebounce(q.trim(), 250), 'track', 1);

  if (isLoading) return <p className="text-muted">Cargando…</p>;
  if (isError || !data) return <p className="text-red-500">Playlist no encontrada.</p>;

  const tracks = data.tracks.map((t) => t.track).filter(Boolean) as Track[];
  const orderedIds = tracks.map((t) => t._id);

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= orderedIds.length) return;
    const next = [...orderedIds];
    [next[index], next[target]] = [next[target], next[index]];
    reorder.mutate(next);
  };

  const onDelete = async () => {
    if (!confirm('¿Eliminar esta playlist?')) return;
    await del.mutateAsync(id);
    navigate('/library');
  };

  const kicker = `Playlist${data.collaborative ? ' · colaborativa' : ''}${!data.public ? ' · privada' : ''}`;

  return (
    <div className="space-y-8 pt-2">
      <MediaHeader
        image={data.image ?? null}
        kicker={kicker}
        title={data.name}
        meta={
          <>
            {data.description && <p className="mb-1 text-main/80">{data.description}</p>}
            <span>
              por{' '}
              <Link to={`/u/${data.owner.username}`} className="font-medium text-main hover:underline">
                {data.owner.name}
              </Link>{' '}
              · {tracks.length} pistas · {data.followersCount} seguidores
            </span>
          </>
        }
        actions={
          <>
            <PlayButton onClick={() => playQueue(tracks, 0)} disabled={!tracks.length} />
            {data.public && <ShareButton path={`/playlist/${id}`} title={data.name} />}
            {!data.isOwner && <FollowButton type="playlist" id={id} />}
            {data.isOwner && (
              <>
                <button type="button" onClick={() => setShowCover(true)} className={pillClass()}>
                  <ImagePlus size={16} /> Portada
                </button>
                {showCover && (
                  <MediaPickerDialog
                    kind="image"
                    scope="mine"
                    title="Seleccionar portada"
                    onSelect={({ url }) => update.mutate({ image: url })}
                    onClose={() => setShowCover(false)}
                  />
                )}
                <button type="button" onClick={() => setEditing((e) => !e)} className={pillClass()}>
                  Editar
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  className={pillClass('!text-red-500 hover:!border-red-500')}
                >
                  Eliminar
                </button>
              </>
            )}
          </>
        }
      />

      {data.canEdit && (
        <section>
          <SectionHeader title="Agregar pistas" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar pistas para agregar…"
            className="w-full max-w-md rounded-lg border border-divider bg-chip px-3 py-2 text-sm outline-none focus:border-brand-secondary"
          />
          {q.trim() && (
            <ul className="mt-2 max-w-md space-y-1">
              {(search.data?.data ?? []).map((t) => (
                <li key={t._id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-main/5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{t.name}</p>
                    <p className="truncate text-xs text-muted">{t.artists?.map((a) => a.artist.name).join(', ')}</p>
                  </div>
                  <button
                    onClick={() => addTracks.mutate([t._id])}
                    className="rounded-full border border-divider p-1.5 text-muted hover:border-brand-secondary hover:text-main"
                    aria-label="Agregar"
                  >
                    <Plus size={14} />
                  </button>
                </li>
              ))}
              {search.data && search.data.data.length === 0 && <li className="text-sm text-muted">Sin resultados.</li>}
            </ul>
          )}
        </section>
      )}

      {editing && data.isOwner && (
        <EditForm
          initial={data}
          onSave={(changes) => {
            update.mutate(changes);
            setEditing(false);
          }}
        />
      )}

      {data.canEdit ? (
        <ul>
          {tracks.map((track, i) => (
            <li key={track._id} className="group flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-main/5">
              <span className="w-6 text-right text-sm tabular-nums text-muted">{i + 1}</span>
              <button
                onClick={() => playQueue(tracks, i)}
                className="min-w-0 flex-1 text-left hover:text-brand-primary"
              >
                <p className="truncate text-sm font-medium">{track.name}</p>
                <p className="truncate text-xs text-muted">
                  {track.artists?.map((a) => a.artist.name).join(', ')}
                </p>
              </button>
              <div className="flex items-center opacity-0 transition group-hover:opacity-100">
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0 || reorder.isPending}
                  className="rounded p-1 text-muted hover:text-main disabled:opacity-30"
                  aria-label="Subir"
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === tracks.length - 1 || reorder.isPending}
                  className="rounded p-1 text-muted hover:text-main disabled:opacity-30"
                  aria-label="Bajar"
                >
                  <ChevronDown size={16} />
                </button>
                <button
                  onClick={() => removeTrack.mutate(track._id)}
                  className="rounded p-1 text-muted hover:text-red-500"
                  aria-label="Quitar"
                >
                  <X size={16} />
                </button>
              </div>
            </li>
          ))}
          {tracks.length === 0 && (
            <li className="py-4 text-muted">Playlist vacía. Agregá pistas desde la página de cada canción.</li>
          )}
        </ul>
      ) : (
        <TrackList tracks={tracks} showAlbum />
      )}
    </div>
  );
}

function EditForm({
  initial,
  onSave,
}: {
  initial: { name: string; description?: string | null; public: boolean; collaborative: boolean };
  onSave: (changes: { name: string; description: string; public: boolean; collaborative: boolean }) => void;
}) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description ?? '');
  const [isPublic, setIsPublic] = useState(initial.public);
  const [collaborative, setCollaborative] = useState(initial.collaborative);

  const field = 'w-full rounded-lg border border-divider bg-chip px-3 py-2 outline-none focus:border-brand-secondary';

  return (
    <div className="max-w-lg space-y-3 rounded-panel bg-chip p-5">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" className={field} />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Descripción"
        rows={2}
        className={field}
      />
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} /> Pública
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={collaborative} onChange={(e) => setCollaborative(e.target.checked)} />{' '}
          Colaborativa
        </label>
      </div>
      <button
        type="button"
        onClick={() => onSave({ name, description, public: isPublic, collaborative })}
        className="rounded-full bg-brand-primary px-5 py-2 text-sm font-semibold text-white hover:bg-brand-primary-light"
      >
        Guardar
      </button>
    </div>
  );
}
