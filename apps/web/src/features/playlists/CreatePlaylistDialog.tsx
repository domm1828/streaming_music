import { useState } from 'react';
import type { PlaylistSummary } from '../library/types';
import { useUploadImage } from '../creator/creator-queries';
import { useCreatePlaylist } from './playlist-queries';

const field = 'w-full rounded-lg border border-divider bg-chip px-3 py-2 text-sm outline-none focus:border-brand-secondary';

export function CreatePlaylistDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: (pl: PlaylistSummary) => void }) {
  const create = useCreatePlaylist();
  const uploadImage = useUploadImage();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [collaborative, setCollaborative] = useState(false);
  const [image, setImage] = useState<string | null>(null);

  if (!open) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    create.mutate(
      { name: name.trim(), description: description.trim() || undefined, public: isPublic, collaborative, image: image ?? undefined },
      {
        onSuccess: (pl) => {
          onCreated?.(pl);
          onClose();
          setName('');
          setDescription('');
          setImage(null);
        },
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="w-full max-w-md space-y-4 rounded-panel bg-elevated p-6 shadow-xl">
        <h2 className="text-lg font-semibold">Nueva playlist</h2>
        <div className="flex gap-4">
          <label className="relative block h-24 w-24 shrink-0 cursor-pointer overflow-hidden rounded-lg bg-chip">
            {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-[10px] text-muted">{uploadImage.isPending ? '…' : 'Portada'}</span>}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage.mutate(f, { onSuccess: setImage }); }} />
          </label>
          <div className="flex-1 space-y-2">
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" className={field} />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Descripción (opcional)" className={field} />
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} /> Pública</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={collaborative} onChange={(e) => setCollaborative(e.target.checked)} /> Colaborativa</label>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full border border-divider px-4 py-2 text-sm text-muted hover:text-main">Cancelar</button>
          <button type="submit" disabled={create.isPending || !name.trim()} className="rounded-full bg-brand-primary px-5 py-2 text-sm font-semibold text-white hover:bg-brand-primary-light disabled:opacity-60">Crear</button>
        </div>
      </form>
    </div>
  );
}
