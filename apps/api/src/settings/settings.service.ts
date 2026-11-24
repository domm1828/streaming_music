import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BRAND } from '@stream-music/shared';
import { Setting, SettingDocument } from './schemas/setting.schema';

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
];

/** Configuración respaldada en base de datos, con caché en memoria. */
@Injectable()
export class SettingsService implements OnModuleInit {
  private cache = new Map<string, unknown>();
  private publicCache: Record<string, unknown> | null = null;

  constructor(@InjectModel(Setting.name) private readonly model: Model<SettingDocument>) {}

  async onModuleInit(): Promise<void> {
    for (const s of DEFAULT_SETTINGS) {
      const exists = await this.model.exists({ key: s.key });
      if (!exists) await this.model.create(s);
      // Normaliza grupo/visibilidad de las claves gestionadas (sin pisar el valor),
      // para que settings sembrados con un grupo viejo queden en su sección actual.
      else await this.model.updateOne({ key: s.key }, { $set: { group: s.group, isPublic: s.isPublic } }).exec();
    }
    await this.refreshCache();
  }

  private async refreshCache(): Promise<void> {
    const all = await this.model.find().lean().exec();
    this.cache = new Map(all.map((s) => [s.key, s.value]));
    this.publicCache = Object.fromEntries(all.filter((s) => s.isPublic).map((s) => [s.key, s.value]));
  }

  async get<T = unknown>(key: string, fallback: T): Promise<T> {
    if (this.cache.has(key)) return (this.cache.get(key) as T) ?? fallback;
    const doc = await this.model.findOne({ key }).lean().exec();
    const value = (doc?.value as T) ?? fallback;
    if (doc) this.cache.set(key, doc.value);
    return value;
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

  /** Todos los settings (admin). */
  async getAll() {
    return this.model.find().sort({ group: 1, key: 1 }).lean().exec();
  }

  async set<T = unknown>(key: string, value: T, meta?: { isPublic?: boolean; group?: string }): Promise<T> {
    const update: Record<string, unknown> = { value };
    if (meta?.isPublic !== undefined) update.isPublic = meta.isPublic;
    if (meta?.group !== undefined) update.group = meta.group;
    await this.model.updateOne({ key }, { $set: update }, { upsert: true }).exec();
    await this.refreshCache();
    return value;
  }

  /** Edición en lote por admin. */
  async setMany(entries: { key: string; value: unknown }[]): Promise<number> {
    for (const e of entries) {
      await this.model.updateOne({ key: e.key }, { $set: { value: e.value } }, { upsert: true }).exec();
    }
    await this.refreshCache();
    return entries.length;
  }
}
