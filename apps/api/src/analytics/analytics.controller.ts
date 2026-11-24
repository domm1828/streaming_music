import { Controller, Get, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PERMISSIONS } from '../auth/rbac/permissions';
import { AnalyticsService } from './analytics.service';

@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PERMISSIONS.CONTENT_MANAGE)
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get()
  overview() {
    return this.service.overview();
  }
}
