import { useEffect, useState } from 'react';
import { useAdminSettings, useSaveSettings } from '../../features/admin/admin-platform-queries';

const TOGGLES: { key: string; label: string; description: string; invert?: boolean }[] = [
  {
    key: 'player.enableDownload',
    label: 'Botón de descarga',
    description: 'Mostrar el botón para descargar pistas de audio.',
  },
  { key: 'player.hideLyrics', label: 'Ocultar letras', description: 'Esconde el botón de letras en el reproductor.', invert: true },
  { key: 'player.hideQueue', label: 'Ocultar cola', description: 'Esconde el botón del panel de cola.', invert: true },
  {
    key: 'player.hideFullscreen',
    label: 'Ocultar pantalla completa',
    description: 'Esconde el botón de pantalla completa del reproductor.',
    invert: true,
  },
];

export function AdminPlayerPage() {
  const { data, isLoading } = useAdminSettings();
  const save = useSaveSettings();
  const [values, setValues] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!data) return;
    const next: Record<string, boolean> = {};
    for (const t of TOGGLES) {
      const raw = data.find((s) => s.key === t.key)?.value;
      next[t.key] = raw === undefined ? !t.invert : raw !== false;
    }
    setValues(next);
  }, [data]);

  const onSave = () => {
    setSaved(false);
    save.mutate(
      TOGGLES.map((t) => ({ key: t.key, value: values[t.key] ?? false })),
      { onSuccess: () => setSaved(true) },
    );
  };

  if (isLoading) return <p className="text-muted">Cargando…</p>;

  return (
    <div className="max-w-xl space-y-6">
      <p className="text-sm text-muted">Controlá qué elementos muestra el reproductor web. Se aplican en vivo a todos los usuarios.</p>

      <section className="space-y-4 rounded-panel bg-chip p-5">
        {TOGGLES.map((t) => (
          <label key={t.key} className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={values[t.key] ?? false}
              onChange={(e) => setValues((v) => ({ ...v, [t.key]: e.target.checked }))}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-medium">{t.label}</span>
              <span className="block text-xs text-muted">{t.description}</span>
            </span>
          </label>
        ))}
      </section>

      <div className="flex items-center gap-3">
        <button
          onClick={onSave}
          disabled={save.isPending}
          className="rounded-full bg-brand-primary px-5 py-2 text-sm font-semibold text-white hover:bg-brand-primary-light disabled:opacity-60"
        >
          {save.isPending ? 'Guardando…' : 'Guardar cambios'}
        </button>
        {saved && <span className="text-sm text-brand-secondary">Guardado.</span>}
      </div>
    </div>
  );
}
