import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface I18nState {
  /** Idioma preferido (persistido) con el que se pide /bootstrap. */
  locale: string;
  /** Cadenas del idioma activo, provistas por /bootstrap. */
  lines: Record<string, string>;
  setI18n: (locale: string, lines: Record<string, string>) => void;
  setLocale: (locale: string) => void;
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set) => ({
      locale: 'es',
      lines: {},
      setI18n: (locale, lines) => set({ locale, lines }),
      setLocale: (locale) => set({ locale }),
    }),
    { name: 'stream-music-locale', partialize: (s) => ({ locale: s.locale }) },
  ),
);

/** Hook de traducción: t(clave, fallback). Devuelve la cadena del idioma activo. */
export function useT() {
  const lines = useI18nStore((s) => s.lines);
  return (key: string, fallback?: string) => lines[key] ?? fallback ?? key;
}
