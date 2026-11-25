import { useEffect, useState } from 'react';
import { BRAND } from '@stream-music/shared';
import { useAdminSettings, useSaveSettings } from '../../features/admin/admin-platform-queries';

type Colors = { primary: string; secondary: string; accent: string };

const FIELDS: { key: keyof Colors; label: string }[] = [
  { key: 'primary', label: 'Primario' },
  { key: 'secondary', label: 'Secundario' },
  { key: 'accent', label: 'Acento' },
];

export function AdminAppearancePage() {
  const { data } = useAdminSettings();
  const save = useSaveSettings();
  const [colors, setColors] = useState<Colors>(BRAND.colors);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (seeded || !data) return;
    const current = data.find((s) => s.key === 'brandColors')?.value as Colors | undefined;
    if (current) setColors({ ...BRAND.colors, ...current });
    setSeeded(true);
  }, [data, seeded]);

  const onSave = () => save.mutate([{ key: 'brandColors', value: colors }]);
  const onReset = () => setColors(BRAND.colors);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Apariencia</h2>
        <p className="text-sm text-muted">Colores de marca aplicados en vivo a toda la app.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4 rounded-panel bg-chip p-5">
          {FIELDS.map((f) => (
            <div key={f.key} className="flex items-center gap-3">
              <input
                type="color"
                value={colors[f.key]}
                onChange={(e) => setColors((c) => ({ ...c, [f.key]: e.target.value }))}
                className="h-10 w-14 cursor-pointer rounded border border-divider bg-chip"
                aria-label={f.label}
              />
              <div className="flex-1">
                <label className="block text-xs font-medium text-muted">{f.label}</label>
                <input
                  value={colors[f.key]}
                  onChange={(e) => setColors((c) => ({ ...c, [f.key]: e.target.value }))}
                  className="w-32 rounded-lg border border-divider bg-chip px-2 py-1 text-sm outline-none focus:border-brand-secondary"
                />
              </div>
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <button
              onClick={onSave}
              disabled={save.isPending}
              className="rounded-full bg-brand-primary px-5 py-2 text-sm font-semibold text-white hover:bg-brand-primary-light disabled:opacity-60"
            >
              {save.isPending ? 'Guardando…' : 'Guardar'}
            </button>
            <button onClick={onReset} className="rounded-full border border-divider px-5 py-2 text-sm text-muted hover:text-main">
              Restablecer
            </button>
            {save.isSuccess && <span className="self-center text-sm text-brand-secondary">Guardado. Recargá para ver todo aplicado.</span>}
          </div>
        </div>

        {/* Vista previa */}
        <div className="space-y-3 rounded-panel bg-chip p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Vista previa</p>
          <div className="flex gap-2">
            {FIELDS.map((f) => (
              <div key={f.key} className="flex-1 text-center">
                <div className="h-16 rounded-lg border border-divider" style={{ backgroundColor: colors[f.key] }} />
                <span className="text-[11px] text-muted">{f.label}</span>
              </div>
            ))}
          </div>
          <button className="rounded-full px-5 py-2 text-sm font-semibold text-white" style={{ backgroundColor: colors.primary }}>
            Botón primario
          </button>
          <p className="text-sm">
            Texto con <span style={{ color: colors.secondary }}>acento secundario</span> y{' '}
            <span style={{ color: colors.accent }}>acento</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
