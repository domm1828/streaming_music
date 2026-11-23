import { Controller, Get, UseGuards } from '@nestjs/common';
import { BRAND } from '@stream-music/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';

/**
 * Estado inicial que consume el frontend al cargar: settings públicos, menús
 * y el usuario autenticado si hay token. Autenticación opcional.
 */
@Controller('bootstrap')
export class BootstrapController {
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  get(@CurrentUser() user?: AuthenticatedUser) {
    return {
      settings: {
        appName: BRAND.name,
        brandColors: BRAND.colors,
        defaultLocale: 'es',
        billingEnabled: false,
      },
      menus: {
        primary: [
          { label: 'Inicio', path: '/' },
          { label: 'Buscar', path: '/search' },
          { label: 'Tu biblioteca', path: '/library', auth: true },
        ],
      },
      user: user ?? null,
    };
  }
}
