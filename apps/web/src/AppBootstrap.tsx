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
    const s = data?.settings as Record<string, unknown> | undefined;
    if (!s) return;

    const c = s.brandColors as { primary?: string; secondary?: string; accent?: string } | undefined;
    const root = document.documentElement;
    if (c?.primary) root.style.setProperty('--color-brand-primary', c.primary);
    if (c?.secondary) root.style.setProperty('--color-brand-secondary', c.secondary);
    if (c?.accent) root.style.setProperty('--color-brand-accent', c.accent);

    // SEO: título y meta description del documento desde los ajustes del admin.
    const title = (s['seo.title'] as string) || (s.appName as string);
    if (title) document.title = title;
    const description = (s['seo.description'] as string) || (s.appDescription as string);
    if (description) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'description');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', description);
    }
  }, [data]);

  return <>{children}</>;
}
