import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthResult, AuthUser } from '@stream-music/shared';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  setAuth: (result: AuthResult) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: AuthUser | null) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setAuth: (result) =>
        set({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          user: result.user,
        }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setUser: (user) => set({ user }),
      clear: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: 'stream-music-auth' },
  ),
);

/** Acceso al estado fuera de React (p. ej. interceptores de axios). */
export const authStore = useAuthStore;
