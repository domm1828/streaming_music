/** Usuario autenticado tal como se adjunta al request (req.user). */
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  username: string;
  roles: string[];
  permissions: string[];
  emailVerified: boolean;
}

/** Payload del access token JWT. */
export interface JwtPayload {
  sub: string;
  email: string;
}
