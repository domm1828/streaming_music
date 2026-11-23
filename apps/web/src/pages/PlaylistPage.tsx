import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Button } from '../components/ui';
import { TrackList } from '../features/catalog/TrackList';
import { FollowButton } from '../features/social/FollowButton';
import {
  useDeletePlaylist,
  usePlaylist,
  useRemoveTrack,
  useReorderTracks,
  useUpdatePlaylist,
} from '../features/playlists/playlist-queries';
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
  const del = useDeletePlaylist();
  const [editing, setEditing] = useState(false);

  if (isLoading) return <p className="opacity-60">Cargando…</p>;
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

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end">
        <div className="h-44 w-44 shrink-0 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-secondary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm uppercase tracking-wide opacity-60">
            Playlist{data.collaborative && ' · colaborativa'}{!data.public && ' · privada'}
          </p>
          <h1 className="truncate text-4xl font-bold">{data.name}</h1>
          {data.description && <p className="mt-1 opacity-70">{data.description}</p>}
          <p className="mt-1 text-sm opacity-60">
            por{' '}
            <Link to={`/u/${data.owner.username}`} className="hover:underline">
              {data.owner.name}
            </Link>{' '}
            · {tracks.length} pistas · {data.followersCount} seguidores
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="w-40">
              <Button type="button" onClick={() => playQueue(tracks, 0)} disabled={!tracks.length}>
                ▶ Reproducir
              </Button>
            </div>
            {!data.isOwner && <FollowButton type="playlist" id={id} />}
            {data.isOwner && (
              <>
                <button
                  type="button"
                  onClick={() => setEditing((e) => !e)}
                  className="rounded-lg border border-brand-secondary/30 px-3 py-2 text-sm font-medium hover:border-brand-secondary/60"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  className="rounded-lg border border-red-500/30 px-3 py-2 text-sm font-medium text-red-500 hover:border-red-500/60"
                >
                  Eliminar
                </button>
              </>
            )}
          </div>
        </div>
      </header>

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
        <ul className="divide-y divide-brand-secondary/10">
          {tracks.map((track, i) => (
            <li key={track._id} className="flex items-center gap-3 py-2">
              <span className="w-6 text-right text-sm tabular-nums opacity-50">{i + 1}</span>
              <button
                onClick={() => playQueue(tracks, i)}
                className="min-w-0 flex-1 text-left hover:text-brand-primary"
              >
                <p className="truncate">{track.name}</p>
                <p className="truncate text-sm opacity-60">
                  {track.artists?.map((a) => a.artist.name).join(', ')}
                </p>
              </button>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0 || reorder.isPending}
                  className="h-7 w-7 rounded hover:bg-brand-primary/10 disabled:opacity-30"
                  aria-label="Subir"
                >
                  ↑
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === tracks.length - 1 || reorder.isPending}
                  className="h-7 w-7 rounded hover:bg-brand-primary/10 disabled:opacity-30"
                  aria-label="Bajar"
                >
                  ↓
                </button>
                <button
                  onClick={() => removeTrack.mutate(track._id)}
                  className="h-7 w-7 rounded text-red-500 hover:bg-red-500/10"
                  aria-label="Quitar"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
          {tracks.length === 0 && (
            <li className="py-4 opacity-60">
              Playlist vacía. Agregá pistas desde la página de cada canción.
            </li>
          )}
        </ul>
      ) : (
        <TrackList tracks={tracks} />
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

  return (
    <div className="space-y-3 rounded-2xl border border-brand-secondary/20 bg-brand-primary/5 p-5">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre"
        className="w-full rounded-lg border border-brand-secondary/30 bg-transparent px-3 py-2 outline-none focus:border-brand-secondary"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Descripción"
        rows={2}
        className="w-full rounded-lg border border-brand-secondary/30 bg-transparent px-3 py-2 outline-none focus:border-brand-secondary"
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
        className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white"
      >
        Guardar
      </button>
    </div>
  );
}
