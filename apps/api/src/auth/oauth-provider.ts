import { createHash, randomBytes } from 'node:crypto';
import type { SocialProfileData } from './social-auth.service';

/** Contrato común de un cliente OAuth social. */
export interface OAuthClient {
  isConfigured(): boolean;
  /** URL de autorización; `verifier` opcional para flujos PKCE (se guarda en cookie). */
  buildAuthorize(redirectUri: string): { url: string; verifier?: string };
  exchange(code: string, redirectUri: string, verifier?: string): Promise<SocialProfileData>;
}

/** base64url sin relleno. */
export function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Par PKCE (code_verifier + code_challenge S256). */
export function createPkce(): { verifier: string; challenge: string } {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

/** Valor aleatorio para el parámetro `state` (anti-CSRF). */
export function randomState(): string {
  return base64url(randomBytes(16));
}
