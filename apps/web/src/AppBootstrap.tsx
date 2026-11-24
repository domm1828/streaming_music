import { useEffect, type ReactNode } from 'react';
import { useBootstrap } from './features/auth/auth-queries';

/**
 * Dispara la carga del estado inicial (/bootstrap) al montar la app (sincroniza
 * el usuario y las traducciones) y aplica los colores de marca configurados por
 * el admin como overrides de los tokens CSS, en vivo.
 */
export function AppBootstrap({ children }: { children: ReactNode }) {
  const { data } = useBootstrap();

  useEffect(() => {
    const c = data?.settings?.brandColors as { primary?: string; secondary?: string; accent?: string } | undefined;
    if (!c) return;
    const root = document.documentElement;
    if (c.primary) root.style.setProperty('--color-brand-primary', c.primary);
    if (c.secondary) root.style.setProperty('--color-brand-secondary', c.secondary);
    if (c.accent) root.style.setProperty('--color-brand-accent', c.accent);
  }, [data]);

  return <>{children}</>;
}
