import type { ReactNode } from 'react';
import { Play } from 'lucide-react';

/** Encabezado de página de media (artwork + título + meta + acciones). */
export function MediaHeader({
  image,
  gradient = 'from-brand-primary to-brand-secondary',
  shape = 'square',
  kicker,
  title,
  meta,
  actions,
}: {
  image?: string | null;
  gradient?: string;
  shape?: 'square' | 'round';
  kicker?: string;
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  const radius = shape === 'round' ? 'rounded-full' : 'rounded-2xl';
  return (
    <header className="flex flex-col gap-6 sm:flex-row sm:items-end">
      <div className={`h-44 w-44 shrink-0 overflow-hidden ${radius} bg-chip shadow-lg`}>
        {image ? (
          <img src={image} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className={`h-full w-full bg-gradient-to-br ${gradient}`} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        {kicker && <p className="text-xs font-semibold uppercase tracking-wide text-muted">{kicker}</p>}
        <h1 className="truncate text-4xl font-bold">{title}</h1>
        {meta && <div className="mt-2 text-sm text-muted">{meta}</div>}
        {actions && <div className="mt-5 flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
    </header>
  );
}

/** Encabezado de sección con acción opcional a la derecha. */
export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      {action}
    </div>
  );
}

/** Botón primario de reproducción (pill con ícono). */
export function PlayButton({
  onClick,
  disabled,
  label = 'Reproducir',
}: {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-full bg-brand-primary px-6 py-3 font-semibold text-white shadow transition hover:scale-105 hover:bg-brand-primary-light disabled:opacity-50 disabled:hover:scale-100"
    >
      <Play size={18} className="ml-0.5" />
      {label}
    </button>
  );
}

/** Botón/enlace secundario estilo pill (borde). */
export function pillClass(extra = ''): string {
  return `inline-flex items-center gap-2 rounded-full border border-divider px-4 py-2 text-sm font-medium text-muted transition hover:border-brand-secondary hover:text-main ${extra}`;
}
