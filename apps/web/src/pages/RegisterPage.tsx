import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { AuthCard, Button, FormError, TextField } from '../components/ui';
import { useRegister } from '../features/auth/auth-queries';
import { applyApiErrors, getApiErrorMessage } from '../lib/api-error';

interface RegisterForm {
  name: string;
  username: string;
  email: string;
  password: string;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const registerUser = useRegister();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>();

  const onSubmit = handleSubmit(async (values) => {
    try {
      await registerUser.mutateAsync(values);
      navigate('/verify-email', { state: { email: values.email } });
    } catch (err) {
      if (!applyApiErrors(err, setError)) {
        setError('root', { message: getApiErrorMessage(err, 'No se pudo crear la cuenta') });
      }
    }
  });

  return (
    <AuthCard title="Crear cuenta" subtitle="Unite a Stream Music">
      <form onSubmit={onSubmit} className="space-y-4">
        <FormError message={errors.root?.message} />
        <TextField label="Nombre" error={errors.name?.message} {...register('name', { required: 'El nombre es obligatorio' })} />
        <TextField label="Usuario" error={errors.username?.message} {...register('username', { required: 'El usuario es obligatorio' })} />
        <TextField label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email', { required: 'El email es obligatorio' })} />
        <TextField
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password', { required: 'La contraseña es obligatoria', minLength: { value: 8, message: 'Mínimo 8 caracteres' } })}
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creando…' : 'Crear cuenta'}
        </Button>
      </form>
      <div className="mt-4 text-center text-sm">
        ¿Ya tenés cuenta?{' '}
        <Link to="/login" className="text-brand-secondary hover:underline">
          Iniciá sesión
        </Link>
      </div>
    </AuthCard>
  );
}
