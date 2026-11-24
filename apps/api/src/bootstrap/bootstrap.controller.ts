import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { BRAND } from '@stream-music/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { LocalizationService } from '../localization/localization.service';
import { SettingsService } from '../settings/settings.service';

interface MenuItem {
  label: string;
  path: string;
  auth?: boolean;
}

const DEFAULT_PRIMARY_MENU: MenuItem[] = [
  { label: 'Inicio', path: '/' },
  { label: 'Buscar', path: '/search' },
  { label: 'Tu biblioteca', path: '/library', auth: true },
];

/**
 * Estado inicial que consume el frontend al cargar: settings públicos, menús,
 * traducciones y el usuario autenticado si hay token. Autenticación opcional.
 */
@Controller('bootstrap')
export class BootstrapController {
  constructor(
    private readonly settings: SettingsService,
    private readonly localization: LocalizationService,
  ) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async get(@CurrentUser() user?: AuthenticatedUser, @Query('locale') locale?: string) {
    const [publicSettings, i18n, primaryMenu] = await Promise.all([
      this.settings.getPublic(),
      this.localization.getLines(locale ?? 'es'),
      this.settings.get<MenuItem[]>('menus', DEFAULT_PRIMARY_MENU),
    ]);

    return {
      settings: {
        appName: (publicSettings.appName as string) ?? BRAND.name,
        brandColors: (publicSettings.brandColors as typeof BRAND.colors) ?? BRAND.colors,
        defaultLocale: (publicSettings.defaultLocale as string) ?? 'es',
        billingEnabled: false,
        ...publicSettings,
      },
      menus: {
        primary: Array.isArray(primaryMenu) && primaryMenu.length > 0 ? primaryMenu : DEFAULT_PRIMARY_MENU,
      },
      i18n,
      user: user ?? null,
    };
  }
}
