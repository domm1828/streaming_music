import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { IsIn, IsOptional } from 'class-validator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PERMISSIONS } from '../auth/rbac/permissions';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { LogsService } from './logs.service';
import type { LogLevel } from './log-entry.schema';

class ListLogsDto extends PaginationQueryDto {
  @IsIn(['error', 'email'])
  @IsOptional()
  level?: LogLevel;
}

@Controller('admin/logs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PERMISSIONS.CONTENT_MANAGE)
export class LogsController {
  constructor(private readonly service: LogsService) {}

  @Get()
  list(@Query() query: ListLogsDto) {
    return this.service.list(query.level, query.page, query.perPage);
  }
}
