import { useEffect, useState } from 'react';
import { useAdminSettings, useSaveSettings } from '../../features/admin/admin-platform-queries';

interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
}

const inputClass =
  'rounded-lg border border-divider bg-chip px-3 py-2 text-sm outline-none focus:border-brand-secondary';

const DEFAULT_COLORS: BrandColors = { primary: '#2d5a34', secondary: '#4e8c56', accent: '#f5b31e' };

export function AdminSettingsPage() {
  const { data, isLoading } = useAdminSettings();
  const save = useSaveSettings();

  const [appName, setAppName] = useState('');
  const [appDescription, setAppDescription] = useState('');
  const [defaultLocale, setDefaultLocale] = useState('es');
  const [registration, setRegistration] = useState(true);
  const [comments, setComments] = useState(true);
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [maxAudioMb, setMaxAudioMb] = useState(50);
  const [colors, setColors] = useState<BrandColors>(DEFAULT_COLORS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!data) return;
    const get = (key: string) => data.find((s) => s.key === key)?.value;
    setAppName((get('appName') as string) ?? '');
    setAppDescription((get('appDescription') as string) ?? '');
    setDefaultLocale((get('defaultLocale') as string) ?? 'es');
    setRegistration((get('registrationEnabled') as boolean) ?? true);
    setComments((get('commentsEnabled') as boolean) ?? true);
    setSeoTitle((get('seo.title') as string) ?? '');
    setSeoDescription((get('seo.description') as string) ?? '');
    setMaxAudioMb((get('uploads.maxAudioMb') as number) ?? 50);
    const c = get('brandColors') as BrandColors | undefined;
    if (c) setColors({ primary: c.primary, secondary: c.secondary, accent: c.accent });
  }, [data]);

  const onSave = () => {
    setSaved(false);
    save.mutate(
      [
        { key: 'appName', value: appName },
        { key: 'appDescription', value: appDescription },
        { key: 'defaultLocale', value: defaultLocale },
        { key: 'registrationEnabled', value: registration },
        { key: 'commentsEnabled', value: comments },
        { key: 'seo.title', value: seoTitle },
        { key: 'seo.description', value: seoDescription },
        { key: 'uploads.maxAudioMb', value: Number(maxAudioMb) || 50 },
        { key: 'brandColors', value: colors },
      ],
      { onSuccess: () => setSaved(true) },
    );
  };

  if (isLoading) return <p className="text-muted">Cargando…</p>;

  return (
    <div className="max-w-xl space-y-6">
      <section className="space-y-4 rounded-panel bg-chip p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">General</h3>
        <label className="block">
          <span className="mb-1 block text-sm">Nombre de la app</span>
          <input value={appName} onChange={(e) => setAppName(e.target.value)} className={`${inputClass} w-full`} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm">Descripción corta</span>
          <input
            value={appDescription}
            onChange={(e) => setAppDescription(e.target.value)}
            className={`${inputClass} w-full`}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm">Idioma por defecto</span>
          <input
            value={defaultLocale}
            onChange={(e) => setDefaultLocale(e.target.value)}
            className={`${inputClass} w-32`}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={registration} onChange={(e) => setRegistration(e.target.checked)} /> Registro
          abierto
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={comments} onChange={(e) => setComments(e.target.checked)} /> Comentarios
          habilitados
        </label>
      </section>

      <section className="space-y-4 rounded-panel bg-chip p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">SEO</h3>
        <label className="block">
          <span className="mb-1 block text-sm">Título del sitio</span>
          <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} className={`${inputClass} w-full`} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm">Meta descripción</span>
          <textarea
            value={seoDescription}
            onChange={(e) => setSeoDescription(e.target.value)}
            rows={2}
            className={`${inputClass} w-full`}
          />
        </label>
        <p className="text-xs text-muted">Se aplican al título y la meta description del documento.</p>
      </section>

      <section className="space-y-4 rounded-panel bg-chip p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Subidas</h3>
        <label className="block">
          <span className="mb-1 block text-sm">Tamaño máximo de audio (MB)</span>
          <input
            type="number"
            min={1}
            max={500}
            value={maxAudioMb}
            onChange={(e) => setMaxAudioMb(Number(e.target.value))}
            className={`${inputClass} w-32`}
          />
        </label>
        <p className="text-xs text-muted">Límite aplicado al subir pistas de audio.</p>
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
        <p className="text-xs text-muted">Los colores se aplican en vivo a los tokens de marca del frontend.</p>
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
