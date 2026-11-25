import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PERMISSIONS } from '../auth/rbac/permissions';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { SettingsService } from '../settings/settings.service';
import { MailService } from './mail.service';

class UpdateEmailSettingsDto {
  @IsIn(['smtp', 'log'])
  transport!: 'smtp' | 'log';

  @IsOptional()
  @IsString()
  host?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @IsOptional()
  @IsBoolean()
  secure?: boolean;

  @IsOptional()
  @IsString()
  user?: string;

  /** Si viene vacío/omitido, se mantiene la contraseña actual. */
  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  fromName?: string;

  @IsOptional()
  @IsString()
  fromAddress?: string;
}

class TestEmailDto {
  @IsOptional()
  @IsEmail()
  to?: string;
}

@Controller('admin/settings/email')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PERMISSIONS.CONTENT_MANAGE)
export class MailSettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly mail: MailService,
  ) {}

  @Get()
  async get() {
    return {
      transport: await this.settings.get<string>('mail.transport', 'smtp'),
      host: await this.settings.get<string>('mail.host', ''),
      port: await this.settings.getNumber('mail.port', 587),
      secure: await this.settings.getBoolean('mail.secure', false),
      user: await this.settings.get<string>('mail.user', ''),
      fromName: await this.settings.get<string>('mail.fromName', 'Stream Music'),
      fromAddress: await this.settings.get<string>('mail.fromAddress', ''),
      hasPassword: await this.settings.hasSecret('mail.pass'),
    };
  }

  @Put()
  async update(@Body() dto: UpdateEmailSettingsDto) {
    const entries: { key: string; value: unknown }[] = [
      { key: 'mail.transport', value: dto.transport },
      { key: 'mail.host', value: dto.host ?? '' },
      { key: 'mail.port', value: dto.port ?? 587 },
      { key: 'mail.secure', value: dto.secure ?? false },
      { key: 'mail.user', value: dto.user ?? '' },
      { key: 'mail.fromName', value: dto.fromName ?? 'Stream Music' },
      { key: 'mail.fromAddress', value: dto.fromAddress ?? '' },
    ];
    // La contraseña sólo se escribe si vino un valor nuevo (vacío = mantener).
    if (dto.password) entries.push({ key: 'mail.pass', value: dto.password });
    await this.settings.setMany(entries);
    return { updated: true };
  }

  @Post('test')
  async test(@CurrentUser() user: AuthenticatedUser, @Body() dto: TestEmailDto) {
    const to = dto.to?.trim() || user.email;
    const result = await this.mail.sendTest(to);
    return { ...result, to };
  }
}
