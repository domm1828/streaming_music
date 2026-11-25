import { useEffect, useState } from 'react';
import {
  useAuthSettings,
  useSaveAuthSettings,
  type AuthSettingsInput,
  type ProviderInput,
} from '../../features/admin/auth-settings-queries';

const inputClass =
  'w-full rounded-lg border border-divider bg-chip px-3 py-2 text-sm outline-none focus:border-brand-secondary';

type Provider = 'google' | 'facebook' | 'twitter';
const PROVIDERS: { key: Provider; label: string }[] = [
  { key: 'google', label: 'Google' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'twitter', label: 'Twitter / X' },
];

type ProvForm = ProviderInput & { hasSecret: boolean };
const emptyProv: ProvForm = { enable: false, id: '', secret: '', hasSecret: false };

export function AdminAuthPage() {
  const { data, isLoading } = useAuthSettings();
  const save = useSaveAuthSettings();

  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [requireEmailConfirmation, setRequireEmailConfirmation] = useState(false);
  const [requireAccount, setRequireAccount] = useState(false);
  const [provs, setProvs] = useState<Record<Provider, ProvForm>>({
    google: { ...emptyProv },
    facebook: { ...emptyProv },
    twitter: { ...emptyProv },
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!data) return;
    setRegistrationEnabled(data.registrationEnabled);
    setRequireEmailConfirmation(data.requireEmailConfirmation);
    setRequireAccount(data.requireAccount);
    setProvs({
      google: { enable: data.google.enable, id: data.google.id, secret: '', hasSecret: data.google.hasSecret },
      facebook: { enable: data.facebook.enable, id: data.facebook.id, secret: '', hasSecret: data.facebook.hasSecret },
      twitter: { enable: data.twitter.enable, id: data.twitter.id, secret: '', hasSecret: data.twitter.hasSecret },
    });
  }, [data]);

  const patchProv = (key: Provider, patch: Partial<ProvForm>) =>
    setProvs((p) => ({ ...p, [key]: { ...p[key], ...patch } }));

  const onSave = () => {
    setSaved(false);
    const provInput = (p: ProvForm): ProviderInput => {
      const out: ProviderInput = { enable: p.enable, id: p.id };
      if (p.secret) out.secret = p.secret;
      return out;
    };
    const body: AuthSettingsInput = {
      registrationEnabled,
      requireEmailConfirmation,
      requireAccount,
      google: provInput(provs.google),
      facebook: provInput(provs.facebook),
      twitter: provInput(provs.twitter),
    };
    save.mutate(body, {
      onSuccess: () => {
        setSaved(true);
        setProvs((p) => ({
          google: { ...p.google, secret: '', hasSecret: p.google.hasSecret || Boolean(p.google.secret) },
          facebook: { ...p.facebook, secret: '', hasSecret: p.facebook.hasSecret || Boolean(p.facebook.secret) },
          twitter: { ...p.twitter, secret: '', hasSecret: p.twitter.hasSecret || Boolean(p.twitter.secret) },
        }));
      },
    });
  };

  if (isLoading) return <p className="text-muted">Cargando…</p>;

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Autenticación</h2>
        <p className="mt-1 text-sm text-muted">Registro, confirmación de email y login con redes sociales.</p>
      </div>

      <section className="space-y-3 rounded-panel bg-chip p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Registro</h3>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={registrationEnabled} onChange={(e) => setRegistrationEnabled(e.target.checked)} />
          Registro abierto (permitir crear cuentas nuevas)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={requireEmailConfirmation}
            onChange={(e) => setRequireEmailConfirmation(e.target.checked)}
          />
          Requerir confirmación de email antes de iniciar sesión
        </label>
      </section>

      <section className="space-y-4 rounded-panel bg-chip p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Login social</h3>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={requireAccount} onChange={(e) => setRequireAccount(e.target.checked)} />
          Requiere una cuenta existente (no crea cuentas nuevas desde redes)
        </label>

        {PROVIDERS.map(({ key, label }) => {
          const p = provs[key];
          return (
            <div key={key} className="space-y-3 rounded-lg border border-divider p-4">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={p.enable} onChange={(e) => patchProv(key, { enable: e.target.checked })} />
                Habilitar {label}
              </label>
              {p.enable && (
                <>
                  <input
                    value={p.id}
                    onChange={(e) => patchProv(key, { id: e.target.value })}
                    placeholder={`${label} client ID`}
                    autoComplete="off"
                    className={inputClass}
                  />
                  <input
                    type="password"
                    value={p.secret}
                    onChange={(e) => patchProv(key, { secret: e.target.value })}
                    autoComplete="new-password"
                    placeholder={p.hasSecret ? '•••••••• (guardado — dejá vacío para mantener)' : `${label} client secret`}
                    className={inputClass}
                  />
                </>
              )}
            </div>
          );
        })}
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
