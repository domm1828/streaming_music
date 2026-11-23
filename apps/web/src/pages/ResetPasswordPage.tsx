import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { AuthCard, Button, FormError, TextField } from '../components/ui';
import { useResetPassword } from '../features/auth/auth-queries';
import { applyApiErrors, getApiErrorMessage } from '../lib/api-error';

interface ResetForm {
  email: string;
  code: string;
  password: string;
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const reset = useResetPassword();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetForm>();

  const onSubmit = handleSubmit(async (values) => {
    try {
      await reset.mutateAsync(values);
      navigate('/login', { replace: true });
    } catch (err) {
      if (!applyApiErrors(err, setError)) {
        setError('root', { message: getApiErrorMessage(err) });
      }
    }
  });

  return (
    <AuthCard title="Nueva contraseña" subtitle="Ingresá el código que recibiste">
      <form onSubmit={onSubmit} className="space-y-4">
        <FormError message={errors.root?.message} />
        <TextField label="Email" type="email" error={errors.email?.message} {...register('email', { required: true })} />
        <TextField label="Código" error={errors.code?.message} {...register('code', { required: 'Ingresá el código' })} />
        <TextField label="Nueva contraseña" type="password" autoComplete="new-password" error={errors.password?.message} {...register('password', { required: true, minLength: { value: 8, message: 'Mínimo 8 caracteres' } })} />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando…' : 'Cambiar contraseña'}
        </Button>
      </form>
    </AuthCard>
  );
}
