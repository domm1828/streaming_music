import { Link, useNavigate } from 'react-router';
import { Button } from '../components/ui';
import { useLogout } from '../features/auth/auth-queries';
import { useAuth } from '../features/auth/use-auth';
import { TwoFactorSettings } from '../features/auth/TwoFactorSettings';

export function AccountPage() {
  const { user } = useAuth();
  const logout = useLogout();
  const navigate = useNavigate();

  const onLogout = async () => {
    await logout.mutateAsync();
    navigate('/login', { replace: true });
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-bold">Tu cuenta</h1>
      {user && (
        <dl className="mt-6 space-y-2 rounded-2xl border border-brand-secondary/20 bg-brand-primary/5 p-6">
          <Row label="Nombre" value={user.name} />
          <Row label="Usuario" value={`@${user.username}`} />
          <Row label="Email" value={user.email} />
          <Row label="Email verificado" value={user.emailVerified ? 'Sí' : 'No'} />
          <Row label="Roles" value={user.roles.join(', ') || '—'} />
        </dl>
      )}
      <div className="mt-6">
        <TwoFactorSettings />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to="/account/profile"
          className="rounded-lg border border-brand-secondary/40 px-4 py-2.5 text-sm font-semibold hover:border-brand-secondary"
        >
          Editar perfil
        </Link>
        <div className="max-w-xs">
          <Button type="button" onClick={onLogout} disabled={logout.isPending}>
            Cerrar sesión
          </Button>
        </div>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-brand-secondary/10 py-1 last:border-0">
      <dt className="opacity-60">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
