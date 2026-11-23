import type { ReactNode } from 'react';
import { useBootstrap } from './features/auth/auth-queries';

/**
 * Dispara la carga del estado inicial (/bootstrap) al montar la app, lo que
 * además sincroniza/valida el usuario autenticado en el store.
 */
export function AppBootstrap({ children }: { children: ReactNode }) {
  useBootstrap();
  return <>{children}</>;
}
