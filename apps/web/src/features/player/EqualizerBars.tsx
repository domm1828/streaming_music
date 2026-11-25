/** Indicador animado de "sonando" (tres barras de ecualizador). */
export function EqualizerBars({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-end gap-[2px] ${className}`} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="sm-eq-bar w-[3px] rounded-sm bg-brand-primary"
          style={{ height: '14px', animationDelay: `${i * 0.18}s` }}
        />
      ))}
    </span>
  );
}
