import type { ButtonHTMLAttributes } from 'react';

type Variant = 'ghost' | 'solid' | 'accent';
type Size = 'sm' | 'md' | 'lg';

const SIZES: Record<Size, string> = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

const VARIANTS: Record<Variant, string> = {
  ghost: 'text-main/70 hover:text-main hover:bg-main/10',
  solid: 'bg-main text-surface hover:scale-105',
  accent: 'bg-brand-primary text-white hover:bg-brand-primary-light hover:scale-105',
};

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  active?: boolean;
}

/** Botón circular de ícono para controles del reproductor y acciones. */
export function IconButton({
  variant = 'ghost',
  size = 'md',
  active = false,
  className = '',
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-full transition disabled:opacity-40 disabled:hover:scale-100 ${SIZES[size]} ${VARIANTS[variant]} ${active ? 'text-brand-accent' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
