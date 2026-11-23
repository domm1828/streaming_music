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

@Injectable()
export class SettingsService implements OnModuleInit {
  constructor(@InjectModel(Setting.name) private readonly model: Model<SettingDocument>) {}

  async onModuleInit(): Promise<void> {
    const exists = await this.model.exists({ key: LANDING_KEY });
    if (!exists) await this.set(LANDING_KEY, DEFAULT_LANDING);
  }

  async get<T = unknown>(key: string, fallback: T): Promise<T> {
    const doc = await this.model.findOne({ key }).lean().exec();
    return (doc?.value as T) ?? fallback;
  }

  async set<T = unknown>(key: string, value: T): Promise<T> {
    await this.model.updateOne({ key }, { $set: { value } }, { upsert: true }).exec();
    return value;
  }
}
