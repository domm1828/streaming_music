import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';

export function Button({
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex w-full items-center justify-center rounded-lg bg-brand-primary px-4 py-2.5 font-semibold text-white transition hover:bg-brand-primary-light disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, ...props }, ref) => (
    <label className="block">
      <span className="mb-1 block text-sm font-medium opacity-80">{label}</span>
      <input
        ref={ref}
        className="w-full rounded-lg border border-brand-secondary/40 bg-transparent px-3 py-2 outline-none focus:border-brand-secondary focus:ring-2 focus:ring-brand-secondary/30"
        {...props}
      />
      {error && <span className="mt-1 block text-sm text-red-500">{error}</span>}
    </label>
  ),
);
TextField.displayName = 'TextField';

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center px-4 py-16">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">
          <span className="text-brand-primary">Stream</span> <span className="text-brand-accent">Music</span>
        </h1>
      </div>
      <div className="rounded-2xl border border-brand-secondary/20 bg-brand-primary/5 p-6">
        <h2 className="text-xl font-semibold">{title}</h2>
        {subtitle && <p className="mt-1 text-sm opacity-70">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500" role="alert">
      {message}
    </p>
  );
}
