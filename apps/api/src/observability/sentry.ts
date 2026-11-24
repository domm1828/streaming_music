import * as Sentry from '@sentry/node';

let enabled = false;

/** Inicializa Sentry si hay DSN configurado. No-op en caso contrario. */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.APP_RELEASE ?? undefined,
    tracesSampleRate: 0.1,
  });
  enabled = true;
}

export function isSentryEnabled(): boolean {
  return enabled;
}

/** Reporta una excepción no controlada (solo si Sentry está activo). */
export function captureException(error: unknown): void {
  if (enabled) Sentry.captureException(error);
}
