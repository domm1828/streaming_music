import { useEffect, useState } from 'react';
import { useAdminSettings, useSaveSettings } from '../../features/admin/admin-platform-queries';

interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
}

const inputClass = 'rounded-lg border border-divider bg-chip px-3 py-2 text-sm outline-none focus:border-brand-secondary';

export function AdminSettingsPage() {
  const { data, isLoading } = useAdminSettings();
  const save = useSaveSettings();

  const [appName, setAppName] = useState('');
  const [defaultLocale, setDefaultLocale] = useState('es');
  const [registration, setRegistration] = useState(true);
  const [comments, setComments] = useState(true);
  const [colors, setColors] = useState<BrandColors>({ primary: '#2d5a34', secondary: '#4e8c56', accent: '#f5b31e' });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!data) return;
    const get = (key: string) => data.find((s) => s.key === key)?.value;
    setAppName((get('appName') as string) ?? '');
    setDefaultLocale((get('defaultLocale') as string) ?? 'es');
    setRegistration((get('registrationEnabled') as boolean) ?? true);
    setComments((get('commentsEnabled') as boolean) ?? true);
    const c = get('brandColors') as BrandColors | undefined;
    if (c) setColors({ primary: c.primary, secondary: c.secondary, accent: c.accent });
  }, [data]);

  const onSave = () => {
    setSaved(false);
    save.mutate(
      [
        { key: 'appName', value: appName },
        { key: 'defaultLocale', value: defaultLocale },
        { key: 'registrationEnabled', value: registration },
        { key: 'commentsEnabled', value: comments },
        { key: 'brandColors', value: colors },
      ],
      { onSuccess: () => setSaved(true) },
    );
  };

  if (isLoading) return <p className="text-muted">Cargando…</p>;

  return (
    <div className="max-w-xl space-y-6">
      <h2 className="text-2xl font-bold">Ajustes</h2>

      <section className="space-y-4 rounded-panel bg-chip p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">General</h3>
        <label className="block">
          <span className="mb-1 block text-sm">Nombre de la app</span>
          <input value={appName} onChange={(e) => setAppName(e.target.value)} className={`${inputClass} w-full`} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm">Idioma por defecto</span>
          <input value={defaultLocale} onChange={(e) => setDefaultLocale(e.target.value)} className={`${inputClass} w-32`} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={registration} onChange={(e) => setRegistration(e.target.checked)} /> Registro abierto
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={comments} onChange={(e) => setComments(e.target.checked)} /> Comentarios habilitados
        </label>
      </section>

      <section className="space-y-4 rounded-panel bg-chip p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Marca (colores)</h3>
        <div className="flex flex-wrap gap-4">
          {(['primary', 'secondary', 'accent'] as const).map((k) => (
            <label key={k} className="flex items-center gap-2 text-sm">
              <input
                type="color"
                value={colors[k]}
                onChange={(e) => setColors((c) => ({ ...c, [k]: e.target.value }))}
                className="h-8 w-10 rounded border border-divider bg-transparent"
              />
              {k}
            </label>
          ))}
        </div>
        <p className="text-xs text-muted">Los colores se aplican en el próximo build del frontend (tokens de marca).</p>
      </section>

      <div className="flex items-center gap-3">
        <button
          onClick={onSave}
          disabled={save.isPending}
          className="rounded-full bg-brand-primary px-5 py-2 text-sm font-semibold text-white hover:bg-brand-primary-light disabled:opacity-60"
        >
          Guardar cambios
        </button>
        {saved && <span className="text-sm text-brand-secondary">Guardado.</span>}
      </div>
    </div>
  );
}
