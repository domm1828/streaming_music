import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PERMISSIONS } from '../auth/rbac/permissions';
import { DEFAULT_LANDING, LANDING_KEY, SettingsService } from '../settings/settings.service';
import { RadioQueryDto } from './dto/radio.dto';
import { RadioService } from './radio.service';

@Controller()
export class DiscoveryController {
  constructor(
    private readonly radio: RadioService,
    private readonly settings: SettingsService,
  ) {}

  /** Radio/recomendaciones a partir de una semilla. */
  @Get('radio')
  getRadio(@Query() query: RadioQueryDto) {
    return this.radio.radio(query.seedType, query.seedId, query.limit ?? 25);
  }

  /** Contenido público de la landing de marketing. */
  @Get('landing')
  getLanding() {
    return this.settings.get(LANDING_KEY, DEFAULT_LANDING);
  }

  /** Edición del contenido de la landing (admin). */
  @Put('landing')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_MANAGE)
  setLanding(@Body() body: Record<string, unknown>) {
    return this.settings.set(LANDING_KEY, body);
  }
}
