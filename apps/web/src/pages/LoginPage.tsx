import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router';
import { AuthCard, Button, FormError, TextField } from '../components/ui';
import { isTwoFactorRequired, useLogin } from '../features/auth/auth-queries';
import { applyApiErrors, getApiErrorMessage } from '../lib/api-error';

interface LoginForm {
  email: string;
  password: string;
  twoFactorCode?: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';
  const login = useLogin();
  const [needs2fa, setNeeds2fa] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>();

  const onSubmit = handleSubmit(async (values) => {
    try {
      const result = await login.mutateAsync(values);
      if (isTwoFactorRequired(result)) {
        setNeeds2fa(true);
        setError('root', { message: 'Ingresá tu código de verificación de dos factores.' });
        return;
      }
      navigate(from, { replace: true });
    } catch (err) {
      if (!applyApiErrors(err, setError)) {
        setError('root', { message: getApiErrorMessage(err, 'No se pudo iniciar sesión') });
      }
    }
  });

  return (
    <AuthCard title="Iniciar sesión" subtitle="Ingresá a tu cuenta de Stream Music">
      <form onSubmit={onSubmit} className="space-y-4">
        <FormError message={errors.root?.message} />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email', { required: 'El email es obligatorio' })}
        />
        <TextField
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password', { required: 'La contraseña es obligatoria' })}
        />
        {needs2fa && (
          <TextField
            label="Código de dos factores"
            autoComplete="one-time-code"
            error={errors.twoFactorCode?.message}
            {...register('twoFactorCode', { required: 'Ingresá el código' })}
          />
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Ingresando…' : 'Ingresar'}
        </Button>
      </form>

      <div className="my-4 flex items-center gap-3 text-xs opacity-50">
        <span className="h-px flex-1 bg-brand-secondary/30" /> o <span className="h-px flex-1 bg-brand-secondary/30" />
      </div>
      <a
        href="/api/v1/auth/social/google"
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-brand-secondary/30 px-4 py-2.5 font-medium hover:border-brand-secondary/60"
      >
        Continuar con Google
      </a>

      <div className="mt-4 flex justify-between text-sm">
        <Link to="/forgot-password" className="text-brand-secondary hover:underline">
          ¿Olvidaste tu contraseña?
        </Link>
        <Link to="/register" className="text-brand-secondary hover:underline">
          Crear cuenta
        </Link>
      </div>
    </AuthCard>
  );
}
