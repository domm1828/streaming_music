/** Usuario autenticado tal como lo devuelve la API. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  username: string;
  roles: string[];
  permissions: string[];
  emailVerified: boolean;
}

/** Resultado de register / login / refresh. */
export interface AuthResult {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

/** Estado inicial que entrega GET /bootstrap. */
export interface BootstrapData {
  settings: {
    appName: string;
    brandColors: { primary: string; secondary: string; accent: string };
    defaultLocale: string;
    billingEnabled: boolean;
  };
  menus: {
    primary: { label: string; path: string; auth?: boolean }[];
  };
  i18n: { locale: string; lines: Record<string, string> };
  user: AuthUser | null;
}
