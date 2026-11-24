import { useQuery } from '@tanstack/react-query';
import type { ApiResponse } from '@stream-music/shared';
import { apiClient } from '../../lib/api-client';
import { useI18nStore } from '../../lib/i18n';

interface LocaleInfo {
  locale: string;
  name: string;
  isDefault?: boolean;
}

export function LanguageSelector() {
  const locale = useI18nStore((s) => s.locale);
  const setLocale = useI18nStore((s) => s.setLocale);
  const { data } = useQuery({
    queryKey: ['localizations'],
    queryFn: async () => (await apiClient.get<ApiResponse<LocaleInfo[]>>('localizations')).data.data,
  });
  const locales = data && data.length > 0 ? data : [{ locale: 'es', name: 'Español' }];

  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value)}
      className="rounded-lg border border-divider bg-chip px-3 py-2 text-sm outline-none focus:border-brand-secondary"
    >
      {locales.map((l) => (
        <option key={l.locale} value={l.locale}>
          {l.name}
        </option>
      ))}
    </select>
  );
}
