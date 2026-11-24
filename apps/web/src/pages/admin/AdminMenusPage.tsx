import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import { useAdminSettings, useSaveSettings, type MenuItem } from '../../features/admin/admin-platform-queries';

const DEFAULT_MENU: MenuItem[] = [
  { label: 'Inicio', path: '/' },
  { label: 'Buscar', path: '/search' },
  { label: 'Tu biblioteca', path: '/library', auth: true },
];

const inputClass = 'rounded-lg border border-divider bg-chip px-3 py-2 text-sm outline-none focus:border-brand-secondary';

export function AdminMenusPage() {
  const { data, isLoading } = useAdminSettings();
  const save = useSaveSettings();
  const [items, setItems] = useState<MenuItem[]>(DEFAULT_MENU);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!data) return;
    const menus = data.find((s) => s.key === 'menus')?.value as MenuItem[] | undefined;
    if (Array.isArray(menus) && menus.length) setItems(menus);
  }, [data]);

  const patch = (i: number, p: Partial<MenuItem>) => setItems((arr) => arr.map((it, j) => (j === i ? { ...it, ...p } : it)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
  };
  const remove = (i: number) => setItems((arr) => arr.filter((_, j) => j !== i));
  const add = () => setItems((arr) => [...arr, { label: 'Nuevo', path: '/' }]);

  const onSave = () => {
    setSaved(false);
    save.mutate([{ key: 'menus', value: items }], { onSuccess: () => setSaved(true) });
  };

  if (isLoading) return <p className="text-muted">Cargando…</p>;

  return (
    <div className="max-w-xl space-y-4">
      <h2 className="text-2xl font-bold">Menú principal</h2>
      <p className="text-sm text-muted">Define los enlaces del menú de navegación que entrega /bootstrap.</p>

      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-2 rounded-lg border border-divider p-2">
            <input value={it.label} onChange={(e) => patch(i, { label: e.target.value })} placeholder="Etiqueta" className={`${inputClass} w-32`} />
            <input value={it.path} onChange={(e) => patch(i, { path: e.target.value })} placeholder="/ruta" className={`${inputClass} flex-1`} />
            <label className="flex items-center gap-1 whitespace-nowrap text-xs text-muted">
              <input type="checkbox" checked={Boolean(it.auth)} onChange={(e) => patch(i, { auth: e.target.checked })} /> auth
            </label>
            <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1 text-muted hover:text-main disabled:opacity-30" aria-label="Subir">
              <ChevronUp size={16} />
            </button>
            <button onClick={() => move(i, 1)} disabled={i === items.length - 1} className="rounded p-1 text-muted hover:text-main disabled:opacity-30" aria-label="Bajar">
              <ChevronDown size={16} />
            </button>
            <button onClick={() => remove(i)} className="rounded p-1 text-muted hover:text-red-500" aria-label="Quitar">
              <X size={16} />
            </button>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-3">
        <button onClick={add} className="inline-flex items-center gap-1 rounded-full border border-divider px-4 py-2 text-sm font-medium text-muted hover:border-brand-secondary hover:text-main">
          <Plus size={16} /> Agregar
        </button>
        <button onClick={onSave} disabled={save.isPending} className="rounded-full bg-brand-primary px-5 py-2 text-sm font-semibold text-white hover:bg-brand-primary-light disabled:opacity-60">
          Guardar
        </button>
        {saved && <span className="text-sm text-brand-secondary">Guardado.</span>}
      </div>
    </div>
  );
}
