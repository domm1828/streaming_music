import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { AuthCard, Button, FormError, TextField } from '../components/ui';
import { useForgotPassword } from '../features/auth/auth-queries';
import { getApiErrorMessage } from '../lib/api-error';

export function ForgotPasswordPage() {
  const forgot = useForgotPassword();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<{ email: string }>();

  const onSubmit = handleSubmit(async ({ email }) => {
    try {
      await forgot.mutateAsync(email);
    } catch (err) {
      setError('root', { message: getApiErrorMessage(err) });
    }
  });

  return (
    <AuthCard title="Recuperar contraseña" subtitle="Te enviaremos un código por email">
      {isSubmitSuccessful && !errors.root ? (
        <div className="space-y-4">
          <p className="rounded-lg bg-brand-secondary/10 px-3 py-2 text-sm">
            Si la cuenta existe, enviamos un código de recuperación a tu email.
          </p>
          <Link to="/reset-password" className="block">
            <Button type="button">Ya tengo el código</Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <FormError message={errors.root?.message} />
          <TextField label="Email" type="email" error={errors.email?.message} {...register('email', { required: 'El email es obligatorio' })} />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Enviando…' : 'Enviar código'}
          </Button>
        </form>
      )}
      <div className="mt-4 text-center text-sm">
        <Link to="/login" className="text-brand-secondary hover:underline">
          Volver a iniciar sesión
        </Link>
      </div>
    </AuthCard>
  );
}
