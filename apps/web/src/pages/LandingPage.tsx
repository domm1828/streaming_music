import { Link } from 'react-router';
import { useLanding } from '../features/discovery/discovery-queries';

export function LandingPage() {
  const { data } = useLanding();
  const hero = data?.hero;
  const features = data?.features ?? [];

  return (
    <div className="min-h-full bg-[color:var(--surface)]">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <span className="text-xl font-bold">
          <span className="text-brand-primary">Stream</span>
          <span className="text-brand-accent">Music</span>
        </span>
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/login" className="font-medium text-brand-secondary hover:underline">
            Iniciar sesión
          </Link>
          <Link to="/register" className="rounded-lg bg-brand-primary px-4 py-2 font-semibold text-white">
            Crear cuenta
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-20 text-center">
        <h1 className="mx-auto max-w-3xl text-5xl font-bold leading-tight">
          {hero?.title ?? 'Tu música, sin límites.'}
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg opacity-70">
          {hero?.subtitle ??
            'Descubrí artistas, armá tu biblioteca y escuchá lo que quieras en Stream Music.'}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            to={hero?.ctaPrimary.path ?? '/register'}
            className="rounded-xl bg-brand-primary px-6 py-3 font-semibold text-white hover:bg-brand-primary-light"
          >
            {hero?.ctaPrimary.label ?? 'Crear cuenta gratis'}
          </Link>
          <Link
            to={hero?.ctaSecondary.path ?? '/'}
            className="rounded-xl border border-brand-secondary/40 px-6 py-3 font-semibold hover:border-brand-secondary"
          >
            {hero?.ctaSecondary.label ?? 'Explorar'}
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-6 pb-24 md:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="rounded-2xl border border-brand-secondary/20 bg-brand-primary/5 p-6">
            <div className="mb-3 h-10 w-10 rounded-lg bg-gradient-to-br from-brand-primary to-brand-accent" />
            <h3 className="text-lg font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm opacity-70">{f.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
