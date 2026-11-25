import { useQuery } from '@tanstack/react-query';
import type { ApiResponse } from '@stream-music/shared';
import { apiClient } from '../../lib/api-client';

type Providers = { google: boolean; facebook: boolean; twitter: boolean };

const LABELS: { key: keyof Providers; label: string }[] = [
  { key: 'google', label: 'Google' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'twitter', label: 'Twitter / X' },
];

/** Botones de login social para los proveedores configurados en el backend. */
export function SocialButtons() {
  const { data } = useQuery({
    queryKey: ['social-providers'],
    queryFn: async () => (await apiClient.get<ApiResponse<Providers>>('auth/social/providers')).data.data,
    staleTime: 5 * 60 * 1000,
  });

  const available = LABELS.filter((p) => data?.[p.key]);
  if (available.length === 0) return null;

  return (
    <div>
      <div className="my-4 flex items-center gap-3 text-xs opacity-50">
        <span className="h-px flex-1 bg-brand-secondary/30" /> o <span className="h-px flex-1 bg-brand-secondary/30" />
      </div>
      <div className="space-y-2">
        {available.map((p) => (
          <a
            key={p.key}
            href={`/api/v1/auth/social/${p.key}`}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-brand-secondary/30 px-4 py-2.5 font-medium hover:border-brand-secondary/60"
          >
            Continuar con {p.label}
          </a>
        ))}
      </div>
    </div>
  );
}
