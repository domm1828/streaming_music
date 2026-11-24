import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Localization, LocalizationDocument } from './schemas/localization.schema';

const DEFAULT_LINES: Record<string, string> = {
  'nav.home': 'Inicio',
  'nav.browse': 'Explorar',
  'nav.search': 'Buscar',
  'nav.radio': 'Radio',
  'nav.library': 'Tu biblioteca',
  'nav.admin': 'Admin',
  'sidebar.playlists': 'Playlists',
  'sidebar.createPlaylist': 'Crear playlist',
  'topbar.searchPlaceholder': 'Buscar artistas, canciones, álbumes…',
  'topbar.login': 'Iniciar sesión',
  'topbar.signup': 'Crear cuenta',
  'player.play': 'Reproducir',
  'player.pause': 'Pausar',
  'common.save': 'Guardar',
  'common.cancel': 'Cancelar',
  'common.loading': 'Cargando…',
};

const EN_LINES: Record<string, string> = {
  'nav.home': 'Home',
  'nav.browse': 'Browse',
  'nav.search': 'Search',
  'nav.radio': 'Radio',
  'nav.library': 'Your library',
  'nav.admin': 'Admin',
  'sidebar.playlists': 'Playlists',
  'sidebar.createPlaylist': 'Create playlist',
  'topbar.searchPlaceholder': 'Search artists, songs, albums…',
  'topbar.login': 'Log in',
  'topbar.signup': 'Sign up',
  'player.play': 'Play',
  'player.pause': 'Pause',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.loading': 'Loading…',
};

@Injectable()
export class LocalizationService implements OnModuleInit {
  constructor(@InjectModel(Localization.name) private readonly model: Model<LocalizationDocument>) {}

  async onModuleInit(): Promise<void> {
    const exists = await this.model.exists({ locale: 'es' });
    if (!exists) {
      await this.model.create({ locale: 'es', name: 'Español', lines: DEFAULT_LINES, isDefault: true });
    }
    const hasEn = await this.model.exists({ locale: 'en' });
    if (!hasEn) {
      await this.model.create({ locale: 'en', name: 'English', lines: EN_LINES, isDefault: false });
    }
  }

  async listLocales() {
    return this.model.find().select('locale name isDefault').lean().exec();
  }

  private async getDefault(): Promise<LocalizationDocument | null> {
    return (await this.model.findOne({ isDefault: true }).exec()) ?? (await this.model.findOne({ locale: 'es' }).exec());
  }

  /** Cadenas del idioma pedido, combinadas sobre el idioma por defecto (fallback). */
  async getLines(locale: string): Promise<{ locale: string; lines: Record<string, string> }> {
    const def = await this.getDefault();
    const requested = await this.model.findOne({ locale: locale.toLowerCase() }).lean().exec();
    const base = def?.lines ?? {};
    const lines = { ...base, ...(requested?.lines ?? {}) };
    return { locale: requested?.locale ?? def?.locale ?? 'es', lines };
  }

  async upsert(locale: string, name: string, lines: Record<string, string>) {
    const doc = await this.model
      .findOneAndUpdate(
        { locale: locale.toLowerCase() },
        { $set: { name, lines } },
        { new: true, upsert: true },
      )
      .lean()
      .exec();
    return doc;
  }
}
