import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { Allow, IsArray, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PERMISSIONS } from '../auth/rbac/permissions';
import { SettingsService } from './settings.service';

class SettingEntryDto {
  @IsString()
  @IsNotEmpty()
  key!: string;

  @Allow()
  value!: unknown;
}

class UpdateSettingsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SettingEntryDto)
  settings!: SettingEntryDto[];
}

@Controller('admin/settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PERMISSIONS.CONTENT_MANAGE)
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get()
  getAll() {
    return this.service.getAll();
  }

  @Put()
  async update(@Body() dto: UpdateSettingsDto) {
    const count = await this.service.setMany(dto.settings);
    return { updated: count };
  }
}
