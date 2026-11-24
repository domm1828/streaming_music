import { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  useAdminPages,
  useCreatePage,
  useDeletePage,
  useUpdatePage,
  type AdminPage,
} from '../../features/admin/admin-platform-queries';

const inputClass = 'w-full rounded-lg border border-divider bg-chip px-3 py-2 text-sm outline-none focus:border-brand-secondary';

function Editor({ page, onClose }: { page: AdminPage | 'new'; onClose: () => void }) {
  const create = useCreatePage();
  const update = useUpdatePage();
  const isNew = page === 'new';
  const [title, setTitle] = useState(isNew ? '' : page.title);
  const [slug, setSlug] = useState(isNew ? '' : page.slug);
  const [body, setBody] = useState(isNew ? '' : page.body);
  const [published, setPublished] = useState(isNew ? false : page.published);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNew) {
      create.mutate({ title, slug: slug || undefined, body, published }, { onSuccess: onClose });
    } else {
      update.mutate({ id: page._id, title, body, published }, { onSuccess: onClose });
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-panel bg-chip p-5">
      <h3 className="font-semibold">{isNew ? 'Nueva página' : `Editar: ${page.title}`}</h3>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" className={inputClass} required />
      {isNew && (
        <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="Slug (opcional, se genera del título)" className={inputClass} />
      )}
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Contenido (HTML/Markdown)" rows={8} className={inputClass} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} /> Publicada
      </label>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={create.isPending || update.isPending}
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

export function AdminPagesPage() {
  const { data, isLoading } = useAdminPages();
  const del = useDeletePage();
  const [editing, setEditing] = useState<AdminPage | 'new' | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Páginas</h2>
        <button
          onClick={() => setEditing('new')}
          className="inline-flex items-center gap-2 rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:bg-brand-primary-light"
        >
          <Plus size={16} /> Nueva
        </button>
      </div>

      {editing && <Editor page={editing} onClose={() => setEditing(null)} />}

      {isLoading ? (
        <p className="text-muted">Cargando…</p>
      ) : (
        <ul className="space-y-2">
          {data?.map((p) => (
            <li key={p._id} className="flex items-center gap-3 rounded-lg border border-divider px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{p.title}</p>
                <p className="truncate text-xs text-muted">
                  /{p.slug} · {p.published ? 'publicada' : 'borrador'}
                </p>
              </div>
              <button onClick={() => setEditing(p)} className="rounded-full border border-divider px-3 py-1 text-xs hover:border-brand-secondary">
                Editar
              </button>
              <button
                onClick={() => confirm(`¿Eliminar "${p.title}"?`) && del.mutate(p._id)}
                className="rounded-full border border-divider px-3 py-1 text-xs text-muted hover:border-red-500 hover:text-red-500"
              >
                Eliminar
              </button>
            </li>
          ))}
          {data && data.length === 0 && <li className="text-muted">No hay páginas.</li>}
        </ul>
      )}
    </div>
  );
}
