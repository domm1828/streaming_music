import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { KeyRound, Link2, LogOut, Monitor } from 'lucide-react';
import {
  connectSocial,
  useApiTokens,
  useChangePassword,
  useCreateApiToken,
  useDeleteAccount,
  useDisconnectSocial,
  useLogout,
  useRevokeApiToken,
  useRevokeOtherSessions,
  useRevokeSession,
  useSessions,
  useSocialConnections,
  useSocialProviders,
  type SocialProviderName,
} from '../features/auth/auth-queries';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '../features/notifications/notification-queries';
import { LanguageSelector } from '../features/i18n/LanguageSelector';
import { useAuth } from '../features/auth/use-auth';
import { TwoFactorSettings } from '../features/auth/TwoFactorSettings';

const inputClass = 'w-full rounded-lg border border-divider bg-chip px-3 py-2 outline-none focus:border-brand-secondary';
const cardClass = 'rounded-panel bg-chip p-6';

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className={cardClass}>
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ChangePassword() {
  const change = useChangePassword();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOk(false);
    if (next !== confirm) return setError('Las contraseñas nuevas no coinciden.');
    if (next.length < 8) return setError('La nueva contraseña debe tener al menos 8 caracteres.');
    change.mutate(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: () => {
          setOk(true);
          setCurrent('');
          setNext('');
          setConfirm('');
        },
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
          setError(msg ?? 'No se pudo cambiar la contraseña.');
        },
      },
    );
  };

  return (
    <form onSubmit={submit} className="max-w-sm space-y-3">
      <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Contraseña actual" autoComplete="current-password" className={inputClass} />
      <input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="Nueva contraseña" autoComplete="new-password" className={inputClass} />
      <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repetir nueva contraseña" autoComplete="new-password" className={inputClass} />
      {error && <p className="text-sm text-red-500">{error}</p>}
      {ok && <p className="text-sm text-brand-secondary">Contraseña actualizada.</p>}
      <button
        type="submit"
        disabled={change.isPending || !current || !next}
        className="rounded-full bg-brand-primary px-5 py-2 text-sm font-semibold text-white hover:bg-brand-primary-light disabled:opacity-60"
      >
        Cambiar contraseña
      </button>
    </form>
  );
}

function Sessions() {
  const sessions = useSessions();
  const revoke = useRevokeSession();
  const revokeOthers = useRevokeOtherSessions();

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {sessions.data?.map((s) => (
          <li key={s.id} className="flex items-center gap-3 rounded-lg bg-surface px-3 py-2">
            <Monitor size={18} className="shrink-0 text-muted" />
            <div className="min-w-0 flex-1 text-sm">
              <p className="truncate">{s.userAgent ?? 'Dispositivo desconocido'}</p>
              <p className="text-xs text-muted">
                {s.ip ?? 'IP desconocida'} · desde {new Date(s.createdAt).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={() => revoke.mutate(s.id)}
              className="rounded-full border border-divider px-3 py-1 text-xs font-medium text-muted hover:border-red-500 hover:text-red-500"
            >
              Cerrar
            </button>
          </li>
        ))}
        {sessions.data && sessions.data.length === 0 && <li className="text-sm text-muted">No hay sesiones activas.</li>}
      </ul>
      <button
        onClick={() => revokeOthers.mutate()}
        disabled={revokeOthers.isPending}
        className="text-sm font-medium text-brand-secondary hover:underline disabled:opacity-60"
      >
        Cerrar las demás sesiones
      </button>
    </div>
  );
}

function DangerZone() {
  const del = useDeleteAccount();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    del.mutate(password, {
      onSuccess: () => navigate('/register', { replace: true }),
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        setError(msg ?? 'No se pudo eliminar la cuenta.');
      },
    });
  };

  return (
    <div className="rounded-panel border border-red-500/30 p-6">
      <h2 className="text-lg font-semibold text-red-500">Zona de peligro</h2>
      <p className="mt-1 text-sm text-muted">Eliminar tu cuenta es permanente y cierra todas tus sesiones.</p>
      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="mt-4 rounded-full border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-500 hover:border-red-500"
        >
          Eliminar mi cuenta
        </button>
      ) : (
        <form onSubmit={submit} className="mt-4 max-w-sm space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Confirmá con tu contraseña"
            autoComplete="current-password"
            className={inputClass}
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={del.isPending || !password}
              className="rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60"
            >
              Eliminar definitivamente
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="rounded-full border border-divider px-4 py-2 text-sm text-muted hover:text-main">
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function ApiTokens() {
  const tokens = useApiTokens();
  const create = useCreateApiToken();
  const revoke = useRevokeApiToken();
  const [name, setName] = useState('');
  const [fresh, setFresh] = useState<string | null>(null);

  const onCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    create.mutate(name.trim(), {
      onSuccess: (t) => {
        setFresh(t.token);
        setName('');
      },
    });
  };

  return (
    <div className="space-y-3">
      {fresh && (
        <div className="rounded-lg bg-surface p-3 text-sm">
          <p className="text-muted">Copiá este token ahora — no se vuelve a mostrar:</p>
          <code className="mt-1 block break-all font-mono text-brand-secondary">{fresh}</code>
        </div>
      )}
      <form onSubmit={onCreate} className="flex max-w-md gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre (p. ej. CLI, script)" className={`${inputClass} flex-1`} />
        <button
          type="submit"
          disabled={create.isPending || !name.trim()}
          className="shrink-0 rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:bg-brand-primary-light disabled:opacity-60"
        >
          Crear
        </button>
      </form>
      <ul className="space-y-2">
        {tokens.data?.map((t) => (
          <li key={t.id} className="flex items-center gap-3 rounded-lg bg-surface px-3 py-2 text-sm">
            <KeyRound size={18} className="shrink-0 text-muted" />
            <div className="min-w-0 flex-1">
              <p className="truncate">{t.name}</p>
              <p className="text-xs text-muted">
                {t.lastUsedAt ? `último uso ${new Date(t.lastUsedAt).toLocaleDateString()}` : 'sin usar'} · creado{' '}
                {new Date(t.createdAt).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={() => revoke.mutate(t.id)}
              className="rounded-full border border-divider px-3 py-1 text-xs font-medium text-muted hover:border-red-500 hover:text-red-500"
            >
              Revocar
            </button>
          </li>
        ))}
        {tokens.data && tokens.data.length === 0 && <li className="text-sm text-muted">No tenés tokens de API.</li>}
      </ul>
    </div>
  );
}

const SOCIAL_LABELS: Record<SocialProviderName, string> = {
  google: 'Google',
  facebook: 'Facebook',
  twitter: 'Twitter / X',
};
const SOCIAL_ORDER: SocialProviderName[] = ['google', 'facebook', 'twitter'];

function SocialConnections() {
  const connections = useSocialConnections();
  const providers = useSocialProviders();
  const disconnect = useDisconnectSocial();
  const [error, setError] = useState<string | null>(null);

  const linked = new Set(connections.data?.map((c) => c.provider));
  const available = providers.data ?? { google: false, facebook: false, twitter: false };
  const visible = SOCIAL_ORDER.filter((p) => available[p] || linked.has(p));

  const onDisconnect = (p: SocialProviderName) => {
    setError(null);
    disconnect.mutate(p, {
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        setError(msg ?? 'No se pudo desconectar.');
      },
    });
  };

  if (visible.length === 0) {
    return <p className="text-sm text-muted">No hay proveedores sociales configurados.</p>;
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-sm text-red-500">{error}</p>}
      {visible.map((p) => (
        <div key={p} className="flex items-center gap-3 rounded-lg bg-surface px-3 py-2 text-sm">
          <Link2 size={18} className="shrink-0 text-muted" />
          <span className="flex-1 font-medium">{SOCIAL_LABELS[p]}</span>
          {linked.has(p) ? (
            <>
              <span className="text-xs text-brand-secondary">Conectado</span>
              <button
                onClick={() => onDisconnect(p)}
                disabled={disconnect.isPending}
                className="rounded-full border border-divider px-3 py-1 text-xs font-medium text-muted hover:border-red-500 hover:text-red-500 disabled:opacity-60"
              >
                Desconectar
              </button>
            </>
          ) : (
            <button
              onClick={() => connectSocial(p).catch(() => setError('No se pudo iniciar la conexión.'))}
              className="rounded-full border border-divider px-3 py-1 text-xs font-medium hover:border-brand-secondary"
            >
              Conectar
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function NotificationPrefs() {
  const prefs = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();
  const enabled = prefs.data?.emailNotifications ?? true;
  return (
    <label className="flex items-center gap-3 text-sm">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => update.mutate({ emailNotifications: e.target.checked })}
        disabled={prefs.isLoading || update.isPending}
      />
      Recibir notificaciones por email
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-divider py-1.5 last:border-0">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

export function AccountPage() {
  const { user } = useAuth();
  const logout = useLogout();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const socialResult = searchParams.get('social');

  const onLogout = async () => {
    await logout.mutateAsync();
    navigate('/login', { replace: true });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 pt-2">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Tu cuenta</h1>
        <button
          onClick={onLogout}
          disabled={logout.isPending}
          className="inline-flex items-center gap-2 rounded-full border border-divider px-4 py-2 text-sm font-medium text-muted hover:border-brand-secondary hover:text-main"
        >
          <LogOut size={16} /> Cerrar sesión
        </button>
      </div>

      {user && (
        <Section title="Perfil">
          <dl className="space-y-1">
            <Row label="Nombre" value={user.name} />
            <Row label="Usuario" value={`@${user.username}`} />
            <Row label="Email" value={user.email} />
            <Row label="Email verificado" value={user.emailVerified ? 'Sí' : 'No'} />
            <Row label="Roles" value={user.roles.join(', ') || '—'} />
          </dl>
          <Link
            to="/account/profile"
            className="mt-4 inline-block rounded-full border border-divider px-4 py-2 text-sm font-semibold hover:border-brand-secondary"
          >
            Editar perfil
          </Link>
        </Section>
      )}

      <Section title="Idioma" description="Idioma de la interfaz.">
        <LanguageSelector />
      </Section>

      <Section title="Cambiar contraseña">
        <ChangePassword />
      </Section>

      <Section title="Conexiones sociales" description="Vinculá tu cuenta con Google, Facebook o Twitter para iniciar sesión con ellos.">
        {socialResult === 'connected' && <p className="mb-3 text-sm text-brand-secondary">Cuenta social vinculada.</p>}
        {socialResult === 'error' && <p className="mb-3 text-sm text-red-500">No se pudo vincular la cuenta social.</p>}
        <SocialConnections />
      </Section>

      <Section title="Sesiones activas" description="Dispositivos donde iniciaste sesión.">
        <Sessions />
      </Section>

      <Section title="Tokens de API" description="Para acceder a la API fuera del navegador (Authorization: Bearer).">
        <ApiTokens />
      </Section>

      <Section title="Notificaciones">
        <NotificationPrefs />
      </Section>

      <div className={cardClass}>
        <TwoFactorSettings />
      </div>

      <DangerZone />
    </div>
  );
}
