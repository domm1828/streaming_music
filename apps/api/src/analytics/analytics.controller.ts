import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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
  overview(@Query('days') days?: string) {
    const parsed = days !== undefined ? Number(days) : undefined;
    return this.service.overview(Number.isFinite(parsed) ? parsed : undefined);
  }
}
