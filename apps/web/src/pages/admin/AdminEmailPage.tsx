import { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import {
  useEmailSettings,
  useSaveEmailSettings,
  useSendTestEmail,
  type EmailSettingsInput,
} from '../../features/admin/email-settings-queries';

const inputClass =
  'w-full rounded-lg border border-divider bg-chip px-3 py-2 text-sm outline-none focus:border-brand-secondary';

export function AdminEmailPage() {
  const { data, isLoading } = useEmailSettings();
  const save = useSaveEmailSettings();
  const test = useSendTestEmail();

  const [transport, setTransport] = useState<'smtp' | 'log'>('smtp');
  const [host, setHost] = useState('');
  const [port, setPort] = useState(587);
  const [secure, setSecure] = useState(false);
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [fromName, setFromName] = useState('Stream Music');
  const [fromAddress, setFromAddress] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testTo, setTestTo] = useState('');

  useEffect(() => {
    if (!data) return;
    setTransport(data.transport);
    setHost(data.host);
    setPort(data.port);
    setSecure(data.secure);
    setUser(data.user);
    setFromName(data.fromName);
    setFromAddress(data.fromAddress);
    setHasPassword(data.hasPassword);
    setPassword('');
  }, [data]);

  const onSave = () => {
    setSaved(false);
    const body: EmailSettingsInput = { transport, host, port, secure, user, fromName, fromAddress };
    if (password) body.password = password;
    save.mutate(body, {
      onSuccess: () => {
        setSaved(true);
        if (password) setHasPassword(true);
        setPassword('');
      },
    });
  };

  if (isLoading) return <p className="text-muted">Cargando…</p>;

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Email</h2>
        <p className="mt-1 text-sm text-muted">
          Configurá cómo se envían los correos (verificación, reset de contraseña, notificaciones).
        </p>
      </div>

      <section className="space-y-4 rounded-panel bg-chip p-5">
        <label className="block">
          <span className="mb-1 block text-sm">Método de envío</span>
          <select value={transport} onChange={(e) => setTransport(e.target.value as 'smtp' | 'log')} className={inputClass}>
            <option value="smtp">SMTP (enviar de verdad)</option>
            <option value="log">Log (sólo registrar, no enviar)</option>
          </select>
        </label>

        {transport === 'smtp' && (
          <>
            <label className="block">
              <span className="mb-1 block text-sm">Servidor (host)</span>
              <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp.proveedor.com" className={inputClass} />
            </label>
            <div className="flex gap-3">
              <label className="block flex-1">
                <span className="mb-1 block text-sm">Puerto</span>
                <input
                  type="number"
                  min={1}
                  max={65535}
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value))}
                  className={inputClass}
                />
              </label>
              <label className="flex items-end gap-2 pb-2 text-sm">
                <input type="checkbox" checked={secure} onChange={(e) => setSecure(e.target.checked)} /> TLS/SSL
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-sm">Usuario</span>
              <input value={user} onChange={(e) => setUser(e.target.value)} autoComplete="off" className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm">Contraseña</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder={hasPassword ? '•••••••• (guardada — dejá vacío para mantener)' : 'Contraseña'}
                className={inputClass}
              />
            </label>
          </>
        )}

        <div className="flex gap-3">
          <label className="block flex-1">
            <span className="mb-1 block text-sm">Nombre del remitente</span>
            <input value={fromName} onChange={(e) => setFromName(e.target.value)} className={inputClass} />
          </label>
          <label className="block flex-1">
            <span className="mb-1 block text-sm">Email del remitente</span>
            <input
              type="email"
              value={fromAddress}
              onChange={(e) => setFromAddress(e.target.value)}
              placeholder="no-reply@tudominio.com"
              className={inputClass}
            />
          </label>
        </div>

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
      </section>

      <section className="space-y-3 rounded-panel bg-chip p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Probar el envío</h3>
        <p className="text-xs text-muted">Guardá los cambios primero. Se envía un correo de prueba a la dirección indicada (o a la tuya).</p>
        <div className="flex gap-2">
          <input
            type="email"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder="destinatario@ejemplo.com (opcional)"
            className={inputClass}
          />
          <button
            onClick={() => test.mutate(testTo || undefined)}
            disabled={test.isPending}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-divider px-4 py-2 text-sm hover:border-brand-secondary disabled:opacity-60"
          >
            <Send size={16} /> {test.isPending ? 'Enviando…' : 'Enviar prueba'}
          </button>
        </div>
        {test.data && (
          <p className={`text-sm ${test.data.ok ? 'text-brand-secondary' : 'text-red-500'}`}>
            {test.data.ok ? `Enviado a ${test.data.to}.` : `Falló: ${test.data.error}`}
          </p>
        )}
        {test.isError && <p className="text-sm text-red-500">No se pudo contactar al servidor.</p>}
      </section>
    </div>
  );
}
