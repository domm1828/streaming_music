import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useAuthStore } from '../features/auth/auth-store';

/** Recibe los tokens del callback OAuth y los guarda; luego redirige al inicio. */
export function SocialCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    if (accessToken && refreshToken) {
      useAuthStore.getState().setTokens(accessToken, refreshToken);
      navigate('/', { replace: true });
    } else {
      navigate('/login?social_error=1', { replace: true });
    }
  }, [params, navigate]);

  return <p className="py-16 text-center opacity-60">Iniciando sesión…</p>;
}
