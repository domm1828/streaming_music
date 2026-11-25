import { Injectable, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BRAND } from '@stream-music/shared';
import type { MailConfig } from '../config/configuration';
import { Setting, SettingDocument } from './schemas/setting.schema';
import { decryptSecret, encryptSecret, isEncrypted } from './secret-crypto';

/**
 * Claves cuyo valor es un secreto: se cifran en reposo, se descifran sólo al
 * consumirlas internamente, y nunca se devuelven al panel admin ni a /bootstrap.
 */
export const SECRET_SETTING_KEYS = new Set<string>([
  'mail.pass',
  'auth.social.google.secret',
  'auth.social.facebook.secret',
  'auth.social.twitter.secret',
  'providers.spotify.secret',
  'providers.lastfm.apiKey',
]);

/** Evento emitido cuando cambian settings (los consumidores recargan su config). */
export const SETTINGS_CHANGED_EVENT = 'settings.changed';

export const LANDING_KEY = 'landing';

/** Contenido por defecto de la landing de marketing. */
export const DEFAULT_LANDING = {
  hero: {
    title: 'Tu música, sin límites.',
    subtitle: 'Descubrí artistas, armá tu biblioteca y escuchá lo que quieras en Stream Music.',
    ctaPrimary: { label: 'Crear cuenta gratis', path: '/register' },
    ctaSecondary: { label: 'Explorar', path: '/browse' },
  },
  features: [
    { title: 'Catálogo ilimitado', text: 'Millones de pistas de artistas de todo el mundo.' },
    { title: 'Tu biblioteca', text: 'Guardá favoritos, armá playlists y seguí a quien quieras.' },
    { title: 'Descubrimiento', text: 'Radio, recomendaciones y bloques curados en tu home.' },
  ],
  brand: BRAND.colors,
};

interface SeedSetting {
  key: string;
  value: unknown;
  isPublic: boolean;
  group: string;
}

const DEFAULT_SETTINGS: SeedSetting[] = [
  { key: LANDING_KEY, value: DEFAULT_LANDING, isPublic: true, group: 'landing' },
  // General
  { key: 'appName', value: BRAND.name, isPublic: true, group: 'general' },
  { key: 'appDescription', value: 'Tu música, sin límites.', isPublic: true, group: 'general' },
  { key: 'defaultLocale', value: 'es', isPublic: true, group: 'general' },
  { key: 'registrationEnabled', value: true, isPublic: true, group: 'general' },
  { key: 'commentsEnabled', value: true, isPublic: true, group: 'general' },
  // SEO
  { key: 'seo.title', value: `${BRAND.name} — Escuchá música online`, isPublic: true, group: 'seo' },
  { key: 'seo.description', value: 'Descubrí artistas, armá tu biblioteca y escuchá lo que quieras.', isPublic: true, group: 'seo' },
  // Subidas
  { key: 'uploads.maxAudioMb', value: 50, isPublic: false, group: 'uploads' },
  // Marca
  { key: 'brandColors', value: BRAND.colors, isPublic: true, group: 'branding' },
  // Reproductor (públicos: el frontend los aplica al player)
  { key: 'player.enableDownload', value: true, isPublic: true, group: 'player' },
  { key: 'player.hideLyrics', value: false, isPublic: true, group: 'player' },
  { key: 'player.hideQueue', value: false, isPublic: true, group: 'player' },
  { key: 'player.hideFullscreen', value: false, isPublic: true, group: 'player' },
];

/** Separa un "Nombre <email@dominio>" en nombre y dirección. */
function parseMailFrom(from: string): { name: string; address: string } {
  const match = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (match) return { name: match[1] || 'Stream Music', address: match[2].trim() };
  return { name: 'Stream Music', address: from.trim() };
}

/** Configuración respaldada en base de datos, con caché en memoria. */
@Injectable()
export class SettingsService implements OnModuleInit {
  private cache = new Map<string, unknown>();
  private publicCache: Record<string, unknown> | null = null;

  constructor(
    @InjectModel(Setting.name) private readonly model: Model<SettingDocument>,
    private readonly config: ConfigService,
    @Optional() private readonly events?: EventEmitter2,
  ) {}

  async onModuleInit(): Promise<void> {
    for (const s of DEFAULT_SETTINGS) {
      const exists = await this.model.exists({ key: s.key });
      if (!exists) await this.model.create(s);
      // Normaliza grupo/visibilidad de las claves gestionadas (sin pisar el valor),
      // para que settings sembrados con un grupo viejo queden en su sección actual.
      else await this.model.updateOne({ key: s.key }, { $set: { group: s.group, isPublic: s.isPublic } }).exec();
    }
    await this.seedEmailDefaults();
    await this.seedAuthDefaults();
    await this.refreshCache();
  }

  /** Clave base para cifrar secretos en reposo (derivada del secreto de JWT). */
  private get cryptoSecret(): string {
    return this.config.get<{ accessSecret: string }>('jwt')?.accessSecret ?? 'dev-settings-secret';
  }

  /**
   * Siembra los settings de email (grupo privado `email`) tomando los valores
   * actuales del `.env` como defaults, sólo si aún no existen. Así el panel
   * aparece pre-cargado con lo que ya estaba configurado por variables de entorno.
   */
  private async seedEmailDefaults(): Promise<void> {
    const mail = this.config.get<MailConfig>('mail');
    const parsed = parseMailFrom(mail?.from ?? 'Stream Music <no-reply@streammusic.local>');
    const defaults: SeedSetting[] = [
      { key: 'mail.transport', value: 'smtp', isPublic: false, group: 'email' },
      { key: 'mail.host', value: mail?.host ?? '', isPublic: false, group: 'email' },
      { key: 'mail.port', value: mail?.port ?? 587, isPublic: false, group: 'email' },
      { key: 'mail.secure', value: false, isPublic: false, group: 'email' },
      { key: 'mail.user', value: '', isPublic: false, group: 'email' },
      { key: 'mail.pass', value: '', isPublic: false, group: 'email' },
      { key: 'mail.fromName', value: parsed.name, isPublic: false, group: 'email' },
      { key: 'mail.fromAddress', value: parsed.address, isPublic: false, group: 'email' },
    ];
    for (const s of defaults) {
      const exists = await this.model.exists({ key: s.key });
      if (!exists) await this.model.create(s);
      else await this.model.updateOne({ key: s.key }, { $set: { group: s.group, isPublic: s.isPublic } }).exec();
    }
  }

  /**
   * Siembra los settings de autenticación (grupo privado `auth`). El `enable` de
   * cada proveedor social arranca según si había credenciales en el `.env`, para
   * no apagar un login que ya funcionaba. Las credenciales NO se siembran: se
   * resuelven con fallback al `.env` hasta que el admin las guarde por el panel.
   */
  private async seedAuthDefaults(): Promise<void> {
    const integrations = this.config.get<Record<string, string>>('integrations') ?? {};
    const hasCreds = (id?: string, secret?: string) => Boolean(id && secret);
    const defaults: SeedSetting[] = [
      { key: 'auth.requireEmailConfirmation', value: false, isPublic: false, group: 'auth' },
      { key: 'auth.social.requireAccount', value: false, isPublic: false, group: 'auth' },
      {
        key: 'auth.social.google.enable',
        value: hasCreds(integrations.googleClientId, integrations.googleClientSecret),
        isPublic: false,
        group: 'auth',
      },
      {
        key: 'auth.social.facebook.enable',
        value: hasCreds(integrations.facebookClientId, integrations.facebookClientSecret),
        isPublic: false,
        group: 'auth',
      },
      {
        key: 'auth.social.twitter.enable',
        value: hasCreds(integrations.twitterClientId, integrations.twitterClientSecret),
        isPublic: false,
        group: 'auth',
      },
    ];
    for (const s of defaults) {
      const exists = await this.model.exists({ key: s.key });
      if (!exists) await this.model.create(s);
      else await this.model.updateOne({ key: s.key }, { $set: { group: s.group, isPublic: s.isPublic } }).exec();
    }
  }

  private async refreshCache(): Promise<void> {
    const all = await this.model.find().lean().exec();
    this.cache = new Map(all.map((s) => [s.key, s.value]));
    this.publicCache = Object.fromEntries(all.filter((s) => s.isPublic).map((s) => [s.key, s.value]));
  }

  async get<T = unknown>(key: string, fallback: T): Promise<T> {
    let raw: unknown;
    if (this.cache.has(key)) raw = this.cache.get(key);
    else {
      const doc = await this.model.findOne({ key }).lean().exec();
      if (doc) {
        raw = doc.value;
        this.cache.set(key, doc.value);
      }
    }
    if (raw === undefined || raw === null) return fallback;
    if (SECRET_SETTING_KEYS.has(key) && isEncrypted(raw)) {
      return (decryptSecret(raw, this.cryptoSecret) as unknown as T) ?? fallback;
    }
    return (raw as T) ?? fallback;
  }

  /** ¿Hay un valor secreto no vacío guardado para esta clave? (sin exponerlo). */
  async hasSecret(key: string): Promise<boolean> {
    if (this.cache.has(key)) {
      const v = this.cache.get(key);
      return typeof v === 'string' && v !== '';
    }
    const doc = await this.model.findOne({ key }).lean().exec();
    return Boolean(doc && typeof doc.value === 'string' && doc.value !== '');
  }

  /** Lee un setting booleano (acepta valores sembrados como string). */
  async getBoolean(key: string, fallback: boolean): Promise<boolean> {
    const v = await this.get<unknown>(key, fallback);
    if (typeof v === 'boolean') return v;
    if (typeof v === 'string') return v === 'true' || v === '1';
    return fallback;
  }

  /** Lee un setting numérico con guardas. */
  async getNumber(key: string, fallback: number): Promise<number> {
    const v = await this.get<unknown>(key, fallback);
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  /** Mapa de settings públicos (para /bootstrap), servido desde caché. */
  async getPublic(): Promise<Record<string, unknown>> {
    if (!this.publicCache) await this.refreshCache();
    return this.publicCache ?? {};
  }

  /** Todos los settings (admin). Los secretos se devuelven redactados (valor vacío). */
  async getAll() {
    const docs = await this.model.find().sort({ group: 1, key: 1 }).lean().exec();
    return docs.map((d) => (SECRET_SETTING_KEYS.has(d.key) ? { ...d, value: '' } : d));
  }

  /** Cifra el valor si la clave es secreta y el valor es un string no vacío. */
  private encodeForStore(key: string, value: unknown): unknown {
    if (SECRET_SETTING_KEYS.has(key) && typeof value === 'string' && value !== '') {
      return encryptSecret(value, this.cryptoSecret);
    }
    return value;
  }

  async set<T = unknown>(key: string, value: T, meta?: { isPublic?: boolean; group?: string }): Promise<T> {
    const update: Record<string, unknown> = { value: this.encodeForStore(key, value) };
    if (meta?.isPublic !== undefined) update.isPublic = meta.isPublic;
    if (meta?.group !== undefined) update.group = meta.group;
    await this.model.updateOne({ key }, { $set: update }, { upsert: true }).exec();
    await this.refreshCache();
    this.events?.emit(SETTINGS_CHANGED_EVENT);
    return value;
  }

  /** Edición en lote por admin. */
  async setMany(entries: { key: string; value: unknown }[]): Promise<number> {
    for (const e of entries) {
      await this.model
        .updateOne({ key: e.key }, { $set: { value: this.encodeForStore(e.key, e.value) } }, { upsert: true })
        .exec();
    }
    await this.refreshCache();
    this.events?.emit(SETTINGS_CHANGED_EVENT);
    return entries.length;
  }
}
