import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router';
import { AuthCard, Button, FormError, TextField } from '../components/ui';
import { useLogin } from '../features/auth/auth-queries';
import { applyApiErrors, getApiErrorMessage } from '../lib/api-error';

interface LoginForm {
  email: string;
  password: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';
  const login = useLogin();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>();

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login.mutateAsync(values);
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
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Ingresando…' : 'Ingresar'}
        </Button>
      </form>
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
