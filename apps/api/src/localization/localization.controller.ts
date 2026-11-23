import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { IsNotEmpty, IsObject, IsString } from 'class-validator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PERMISSIONS } from '../auth/rbac/permissions';
import { LocalizationService } from './localization.service';

class UpsertLocalizationDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsObject()
  lines!: Record<string, string>;
}

@Controller()
export class LocalizationController {
  constructor(private readonly service: LocalizationService) {}

  @Get('localizations')
  list() {
    return this.service.listLocales();
  }

  @Get('localizations/:locale')
  lines(@Param('locale') locale: string) {
    return this.service.getLines(locale);
  }

  @Put('admin/localizations/:locale')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_MANAGE)
  upsert(@Param('locale') locale: string, @Body() dto: UpsertLocalizationDto) {
    return this.service.upsert(locale, dto.name, dto.lines);
  }
}
