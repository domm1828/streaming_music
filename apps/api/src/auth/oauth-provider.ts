import { createHash, randomBytes } from 'node:crypto';
import type { ConfigService } from '@nestjs/config';
import type { SettingsService } from '../settings/settings.service';
import type { SocialProvider } from './schemas/social-profile.schema';
import type { SocialProfileData } from './social-auth.service';

/** Contrato común de un cliente OAuth social (resolución async desde settings). */
export interface OAuthClient {
  isConfigured(): Promise<boolean>;
  /** URL de autorización; `verifier` opcional para flujos PKCE (se guarda en cookie). */
  buildAuthorize(redirectUri: string): Promise<{ url: string; verifier?: string }>;
  exchange(code: string, redirectUri: string, verifier?: string): Promise<SocialProfileData>;
}

export interface SocialCreds {
  id: string;
  secret: string;
  enabled: boolean;
}

/**
 * Base de los clientes OAuth sociales: resuelve enable + credenciales desde los
 * settings en DB (`auth.social.<prov>.*`), con fallback a las variables de
 * entorno. El flag `enable` por defecto sigue "configurado por entorno" para no
 * romper instalaciones que ya tenían credenciales en el `.env`.
 */
export abstract class BaseSocialOAuth implements OAuthClient {
  protected abstract readonly provider: SocialProvider;

  constructor(
    protected readonly config: ConfigService,
    protected readonly settings: SettingsService,
  ) {}

  /** Credenciales del `.env` (fallback) para este proveedor. */
  protected abstract envCreds(): { id: string; secret: string };

  protected async resolveCreds(): Promise<SocialCreds> {
    const env = this.envCreds();
    const id = await this.settings.get<string>(`auth.social.${this.provider}.id`, env.id);
    const secret = await this.settings.get<string>(`auth.social.${this.provider}.secret`, env.secret);
    const hasCreds = Boolean(id && secret);
    const enabled = await this.settings.getBoolean(`auth.social.${this.provider}.enable`, hasCreds);
    return { id, secret, enabled };
  }

  async isConfigured(): Promise<boolean> {
    const c = await this.resolveCreds();
    return c.enabled && Boolean(c.id && c.secret);
  }

  abstract buildAuthorize(redirectUri: string): Promise<{ url: string; verifier?: string }>;
  abstract exchange(code: string, redirectUri: string, verifier?: string): Promise<SocialProfileData>;
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
