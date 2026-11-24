import * as Sentry from '@sentry/react';

/** Inicializa Sentry en el frontend si hay DSN (vía variable de entorno de build). */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_RELEASE as string | undefined,
    tracesSampleRate: 0.1,
  });
}
