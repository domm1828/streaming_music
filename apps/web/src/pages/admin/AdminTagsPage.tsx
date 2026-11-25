import { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  useAdminTags,
  useCreateTag,
  useDeleteTag,
  useUpdateTag,
  type TagStats,
} from '../../features/admin/catalog-admin-queries';

const inputClass = 'w-full rounded-lg border border-divider bg-chip px-3 py-2 text-sm outline-none focus:border-brand-secondary';

function Editor({ tag, onClose }: { tag: TagStats | 'new'; onClose: () => void }) {
  const create = useCreateTag();
  const update = useUpdateTag();
  const isNew = tag === 'new';
  const [displayName, setDisplayName] = useState(isNew ? '' : tag.displayName);
  const [color, setColor] = useState(isNew ? '' : tag.color ?? '');
  const [description, setDescription] = useState(isNew ? '' : tag.description ?? '');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const dto = { displayName, color: color || undefined, description: description || undefined };
    if (isNew) create.mutate(dto, { onSuccess: onClose });
    else update.mutate({ id: tag._id, ...dto }, { onSuccess: onClose });
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-panel bg-chip p-5">
      <h3 className="font-semibold">{isNew ? 'Nuevo tag' : `Editar: ${tag.displayName}`}</h3>
      <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Nombre visible" className={inputClass} required />
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={color || '#4e8c56'}
          onChange={(e) => setColor(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded border border-divider bg-chip"
          aria-label="Color"
        />
        <input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Color (hex, opcional)" className={inputClass} />
      </div>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción (opcional)" rows={2} className={inputClass} />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={create.isPending || update.isPending || !displayName.trim()}
          className="rounded-full bg-brand-primary px-5 py-2 text-sm font-semibold text-white hover:bg-brand-primary-light disabled:opacity-60"
        >
          Guardar
        </button>
        <button type="button" onClick={onClose} className="rounded-full border border-divider px-5 py-2 text-sm text-muted hover:text-main">
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function AdminTagsPage() {
  const { data, isLoading } = useAdminTags();
  const del = useDeleteTag();
  const [editing, setEditing] = useState<TagStats | 'new' | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Tags</h2>
        <button
          onClick={() => setEditing('new')}
          className="inline-flex items-center gap-2 rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:bg-brand-primary-light"
        >
          <Plus size={16} /> Nuevo
        </button>
      </div>

      {editing && <Editor tag={editing} onClose={() => setEditing(null)} />}

      {isLoading ? (
        <p className="text-muted">Cargando…</p>
      ) : (
        <ul className="space-y-2">
          {data?.map((t) => (
            <li key={t._id} className="flex items-center gap-3 rounded-lg border border-divider px-4 py-3">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: t.color ?? 'var(--color-brand-accent, #f5b31e)' }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{t.displayName}</p>
                <p className="truncate text-xs text-muted">
                  /{t.name} · {t.tracksCount} {t.tracksCount === 1 ? 'pista' : 'pistas'}
                </p>
              </div>
              <button onClick={() => setEditing(t)} className="rounded-full border border-divider px-3 py-1 text-xs hover:border-brand-secondary">
                Editar
              </button>
              <button
                onClick={() => confirm(`¿Eliminar "${t.displayName}"?`) && del.mutate(t._id)}
                className="rounded-full border border-divider px-3 py-1 text-xs text-muted hover:border-red-500 hover:text-red-500"
              >
                Eliminar
              </button>
            </li>
          ))}
          {data && data.length === 0 && <li className="text-muted">No hay tags.</li>}
        </ul>
      )}
    </div>
  );
}
