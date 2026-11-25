import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';
import type { IntegrationsConfig } from '../config/configuration';
import { SettingsService } from '../settings/settings.service';
import { RequirePermissions } from './decorators/require-permissions.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { PERMISSIONS } from './rbac/permissions';

type Provider = 'google' | 'facebook' | 'twitter';
const PROVIDERS: Provider[] = ['google', 'facebook', 'twitter'];

class ProviderDto {
  @IsBoolean()
  enable!: boolean;

  @IsOptional()
  @IsString()
  id?: string;

  /** Vacío/omitido = mantener el secreto actual. */
  @IsOptional()
  @IsString()
  secret?: string;
}

class UpdateAuthSettingsDto {
  @IsBoolean()
  registrationEnabled!: boolean;

  @IsBoolean()
  requireEmailConfirmation!: boolean;

  @IsBoolean()
  requireAccount!: boolean;

  @ValidateNested()
  @Type(() => ProviderDto)
  google!: ProviderDto;

  @ValidateNested()
  @Type(() => ProviderDto)
  facebook!: ProviderDto;

  @ValidateNested()
  @Type(() => ProviderDto)
  twitter!: ProviderDto;
}

@Controller('admin/settings/auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PERMISSIONS.CONTENT_MANAGE)
export class AuthSettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly config: ConfigService,
  ) {}

  private envCreds(): IntegrationsConfig | undefined {
    return this.config.get<IntegrationsConfig>('integrations');
  }

  private async providerState(p: Provider) {
    const env = this.envCreds();
    const envId = (env?.[`${p}ClientId` as keyof IntegrationsConfig] as string) ?? '';
    const envSecret = (env?.[`${p}ClientSecret` as keyof IntegrationsConfig] as string) ?? '';
    return {
      enable: await this.settings.getBoolean(`auth.social.${p}.enable`, Boolean(envId && envSecret)),
      id: await this.settings.get<string>(`auth.social.${p}.id`, envId),
      hasSecret: (await this.settings.hasSecret(`auth.social.${p}.secret`)) || Boolean(envSecret),
    };
  }

  @Get()
  async get() {
    const [google, facebook, twitter] = await Promise.all(PROVIDERS.map((p) => this.providerState(p)));
    return {
      registrationEnabled: await this.settings.getBoolean('registrationEnabled', true),
      requireEmailConfirmation: await this.settings.getBoolean('auth.requireEmailConfirmation', false),
      requireAccount: await this.settings.getBoolean('auth.social.requireAccount', false),
      google,
      facebook,
      twitter,
    };
  }

  @Put()
  async update(@Body() dto: UpdateAuthSettingsDto) {
    const entries: { key: string; value: unknown }[] = [
      { key: 'registrationEnabled', value: dto.registrationEnabled },
      { key: 'auth.requireEmailConfirmation', value: dto.requireEmailConfirmation },
      { key: 'auth.social.requireAccount', value: dto.requireAccount },
    ];
    for (const p of PROVIDERS) {
      const prov = dto[p];
      entries.push({ key: `auth.social.${p}.enable`, value: prov.enable });
      entries.push({ key: `auth.social.${p}.id`, value: prov.id ?? '' });
      if (prov.secret) entries.push({ key: `auth.social.${p}.secret`, value: prov.secret });
    }
    await this.settings.setMany(entries);
    return { updated: true };
  }
}
