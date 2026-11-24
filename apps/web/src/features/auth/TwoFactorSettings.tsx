import { useState } from 'react';
import {
  useTwoFactorDisable,
  useTwoFactorEnable,
  useTwoFactorSetup,
  useTwoFactorStatus,
  type TwoFactorSetup,
} from './two-factor-queries';

export function TwoFactorSettings() {
  const status = useTwoFactorStatus();
  const setup = useTwoFactorSetup();
  const enable = useTwoFactorEnable();
  const disable = useTwoFactorDisable();
  const [pending, setPending] = useState<TwoFactorSetup | null>(null);
  const [code, setCode] = useState('');
  const [recovery, setRecovery] = useState<string[] | null>(null);

  const enabled = status.data?.enabled;

  const startSetup = async () => {
    const data = await setup.mutateAsync();
    setPending(data);
  };

  const confirmEnable = async () => {
    const res = await enable.mutateAsync(code);
    setRecovery(res.recoveryCodes);
    setPending(null);
    setCode('');
  };

  return (
    <section className="rounded-2xl border border-brand-secondary/20 bg-brand-primary/5 p-5">
      <h2 className="text-lg font-semibold">Autenticación de dos factores</h2>
      <p className="mt-1 text-sm opacity-70">
        Protegé tu cuenta con un segundo factor (app de autenticación TOTP).
      </p>

      {recovery && (
        <div className="mt-3 rounded-lg border border-brand-accent/40 bg-brand-accent/10 p-3">
          <p className="text-sm font-medium">Guardá tus códigos de recuperación:</p>
          <div className="mt-2 grid grid-cols-2 gap-1 font-mono text-sm">
            {recovery.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4">
        {enabled ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-brand-primary/15 px-2 py-1 text-sm text-brand-primary">Activo</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Código para desactivar"
              className="rounded-lg border border-brand-secondary/30 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-secondary"
            />
            <button
              type="button"
              onClick={() => disable.mutate(code, { onSuccess: () => setCode('') })}
              disabled={!code || disable.isPending}
              className="rounded-lg border border-red-500/30 px-3 py-2 text-sm font-medium text-red-500 hover:border-red-500/60 disabled:opacity-60"
            >
              Desactivar
            </button>
          </div>
        ) : pending ? (
          <div className="space-y-3">
            <img src={pending.qrDataUrl} alt="QR 2FA" className="h-40 w-40 rounded-lg bg-white p-2" />
            <p className="text-xs opacity-60">
              Escaneá el QR con tu app de autenticación y luego ingresá el código generado.
            </p>
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Código de 6 dígitos"
                className="rounded-lg border border-brand-secondary/30 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-secondary"
              />
              <button
                type="button"
                onClick={confirmEnable}
                disabled={!code || enable.isPending}
                className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Confirmar
              </button>
            </div>
            {enable.isError && <p className="text-sm text-red-500">Código inválido, probá de nuevo.</p>}
          </div>
        ) : (
          <button
            type="button"
            onClick={startSetup}
            disabled={setup.isPending}
            className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Activar 2FA
          </button>
        )}
      </div>
    </section>
  );
}
