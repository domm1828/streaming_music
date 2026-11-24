import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { IsEnum } from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PERMISSIONS } from '../auth/rbac/permissions';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { EXPORT_TYPES, type ExportType } from './schemas/export-job.schema';
import { ExportsService } from './exports.service';

class CreateExportDto {
  @IsEnum(EXPORT_TYPES)
  type!: ExportType;
}

@Controller('admin/exports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PERMISSIONS.CONTENT_MANAGE)
export class ExportsController {
  constructor(private readonly service: ExportsService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  create(@Body() dto: CreateExportDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.createAndRun(dto.type, user.id);
  }

  @Get()
  list() {
    return this.service.listJobs();
  }

  @Get(':id/download')
  async download(@Param('id') id: string, @Res() res: Response) {
    const { absolutePath, filename } = await this.service.fileForDownload(id);
    res.download(absolutePath, filename);
  }
}
