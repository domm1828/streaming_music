import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router';
import { AuthCard, Button, FormError, TextField } from '../components/ui';
import { useVerifyEmail } from '../features/auth/auth-queries';
import { applyApiErrors, getApiErrorMessage } from '../lib/api-error';

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const presetEmail = (location.state as { email?: string } | null)?.email ?? '';
  const verify = useVerifyEmail();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<{ email: string; code: string }>({ defaultValues: { email: presetEmail } });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await verify.mutateAsync(values);
      navigate('/', { replace: true });
    } catch (err) {
      if (!applyApiErrors(err, setError)) {
        setError('root', { message: getApiErrorMessage(err) });
      }
    }
  });

  return (
    <AuthCard title="Verificá tu email" subtitle="Te enviamos un código de 6 dígitos">
      <form onSubmit={onSubmit} className="space-y-4">
        <FormError message={errors.root?.message} />
        <TextField label="Email" type="email" error={errors.email?.message} {...register('email', { required: true })} />
        <TextField label="Código" error={errors.code?.message} {...register('code', { required: 'Ingresá el código' })} />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Verificando…' : 'Verificar'}
        </Button>
      </form>
    </AuthCard>
  );
}
