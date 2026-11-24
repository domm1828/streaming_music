import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { mutate } from '../../lib/http';
import { useAuth } from '../auth/use-auth';
import { useCreatePlaylist, useMyPlaylists } from './playlist-queries';

export function AddToPlaylist({ trackId }: { trackId: string }) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const qc = useQueryClient();
  const { data } = useMyPlaylists();
  const create = useCreatePlaylist();

  const addTo = useMutation({
    mutationFn: (playlistId: string) =>
      mutate('post', `playlists/${playlistId}/tracks`, { trackIds: [trackId] }),
    onSuccess: (_d, playlistId) => {
      qc.invalidateQueries({ queryKey: ['playlist', playlistId] });
      setOpen(false);
    },
  });

  const onCreateAndAdd = async () => {
    if (!newName.trim()) return;
    const pl = await create.mutateAsync({ name: newName.trim() });
    await addTo.mutateAsync(pl._id);
    setNewName('');
  };

  if (!isAuthenticated) {
    return (
      <button
        type="button"
        onClick={() => navigate('/login')}
        className="rounded-lg border border-brand-secondary/30 px-3 py-2 text-sm font-medium hover:border-brand-secondary/60"
      >
        + Playlist
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg border border-brand-secondary/30 px-3 py-2 text-sm font-medium hover:border-brand-secondary/60"
      >
        + Playlist
      </button>
      {open && (
        <div className="absolute z-20 mt-2 w-60 rounded-xl border border-brand-secondary/20 bg-[color:var(--surface)] p-2 shadow-lg">
          <p className="px-2 py-1 text-xs uppercase tracking-wide opacity-50">Agregar a</p>
          <ul className="max-h-48 overflow-auto">
            {data?.data.map((pl) => (
              <li key={pl._id}>
                <button
                  type="button"
                  onClick={() => addTo.mutate(pl._id)}
                  className="w-full truncate rounded px-2 py-1.5 text-left text-sm hover:bg-brand-primary/10"
                >
                  {pl.name}
                </button>
              </li>
            ))}
            {data && data.data.length === 0 && (
              <li className="px-2 py-1 text-sm opacity-60">No tenés playlists aún.</li>
            )}
          </ul>
          <div className="mt-2 flex gap-1 border-t border-brand-secondary/20 pt-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nueva playlist"
              className="min-w-0 flex-1 rounded border border-brand-secondary/30 bg-transparent px-2 py-1 text-sm outline-none focus:border-brand-secondary"
            />
            <button
              type="button"
              onClick={onCreateAndAdd}
              disabled={create.isPending || addTo.isPending}
              className="rounded bg-brand-primary px-2 py-1 text-sm font-medium text-white disabled:opacity-60"
            >
              Crear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
