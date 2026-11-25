import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { getOne, mutate } from '../../lib/http';

interface Locale {
  locale: string;
  name: string;
  isDefault?: boolean;
}

function useLocales() {
  return useQuery({ queryKey: ['admin-locales'], queryFn: () => getOne<Locale[]>('localizations') });
}
function useLocaleLines(locale: string | null) {
  return useQuery({
    queryKey: ['admin-locale-lines', locale],
    queryFn: () => getOne<{ locale: string; lines: Record<string, string> }>(`localizations/${locale}`),
    enabled: Boolean(locale),
  });
}
function useSaveLocale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ locale, name, lines }: { locale: string; name: string; lines: Record<string, string> }) =>
      mutate('put', `admin/localizations/${locale}`, { name, lines }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['admin-locales'] });
      qc.invalidateQueries({ queryKey: ['admin-locale-lines', v.locale] });
    },
  });
}

const inputClass = 'w-full rounded-lg border border-divider bg-chip px-3 py-2 text-sm outline-none focus:border-brand-secondary';

export function AdminLocalizationsPage() {
  const locales = useLocales();
  const [selected, setSelected] = useState<string | null>(null);
  const linesQuery = useLocaleLines(selected);
  const save = useSaveLocale();

  const [name, setName] = useState('');
  const [lines, setLines] = useState<Record<string, string>>({});
  const [newLocale, setNewLocale] = useState('');
  const [newKey, setNewKey] = useState('');

  useEffect(() => {
    if (!selected && locales.data && locales.data.length > 0) setSelected(locales.data[0].locale);
  }, [locales.data, selected]);

  useEffect(() => {
    if (linesQuery.data) {
      setLines(linesQuery.data.lines);
      setName(locales.data?.find((l) => l.locale === selected)?.name ?? selected ?? '');
    }
  }, [linesQuery.data, locales.data, selected]);

  const createLocale = () => {
    const code = newLocale.trim().toLowerCase();
    if (!code) return;
    save.mutate(
      { locale: code, name: code.toUpperCase(), lines: {} },
      { onSuccess: () => { setNewLocale(''); setSelected(code); } },
    );
  };

  const addKey = () => {
    const k = newKey.trim();
    if (!k || k in lines) return;
    setLines((l) => ({ ...l, [k]: '' }));
    setNewKey('');
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Idiomas</h2>

      <div className="flex flex-wrap items-center gap-2">
        {locales.data?.map((l) => (
          <button
            key={l.locale}
            onClick={() => setSelected(l.locale)}
            className={`rounded-full px-3 py-1 text-sm transition ${
              selected === l.locale ? 'bg-brand-primary text-white' : 'border border-divider text-muted hover:border-brand-secondary'
            }`}
          >
            {l.name} ({l.locale}){l.isDefault ? ' ·★' : ''}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-divider" />
        <input value={newLocale} onChange={(e) => setNewLocale(e.target.value)} placeholder="código (ej: pt)" className="w-28 rounded-lg border border-divider bg-chip px-2 py-1 text-sm" />
        <button onClick={createLocale} className="inline-flex items-center gap-1 rounded-full border border-divider px-3 py-1 text-sm hover:border-brand-secondary">
          <Plus size={14} /> Agregar idioma
        </button>
      </div>

      {selected && (
        <div className="space-y-3 rounded-panel bg-chip p-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Nombre del idioma</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={`${inputClass} max-w-xs`} />
          </div>

          <div className="max-h-[50vh] space-y-1 overflow-auto">
            {Object.keys(lines).sort().map((k) => (
              <div key={k} className="flex items-center gap-2">
                <code className="w-56 shrink-0 truncate text-xs text-muted" title={k}>{k}</code>
                <input
                  value={lines[k]}
                  onChange={(e) => setLines((l) => ({ ...l, [k]: e.target.value }))}
                  className={inputClass}
                />
              </div>
            ))}
            {Object.keys(lines).length === 0 && <p className="text-sm text-muted">Sin cadenas todavía.</p>}
          </div>

          <div className="flex items-center gap-2">
            <input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="nueva clave (ej: nav.home)" className={`${inputClass} max-w-xs`} />
            <button onClick={addKey} className="rounded-full border border-divider px-3 py-1 text-sm hover:border-brand-secondary">Agregar clave</button>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => selected && save.mutate({ locale: selected, name, lines })}
              disabled={save.isPending}
              className="rounded-full bg-brand-primary px-5 py-2 text-sm font-semibold text-white hover:bg-brand-primary-light disabled:opacity-60"
            >
              {save.isPending ? 'Guardando…' : 'Guardar'}
            </button>
            {save.isSuccess && <span className="self-center text-sm text-brand-secondary">Guardado.</span>}
          </div>
        </div>
      )}
    </div>
  );
}
