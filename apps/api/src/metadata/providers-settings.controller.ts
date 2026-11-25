import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PERMISSIONS } from '../auth/rbac/permissions';
import type { IntegrationsConfig } from '../config/configuration';
import { SettingsService } from '../settings/settings.service';

class SpotifyDto {
  @IsOptional()
  @IsString()
  id?: string;

  /** Vacío/omitido = mantener el secreto actual. */
  @IsOptional()
  @IsString()
  secret?: string;
}

class LastfmDto {
  /** Vacío/omitido = mantener la API key actual. */
  @IsOptional()
  @IsString()
  apiKey?: string;
}

class UpdateProvidersDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => SpotifyDto)
  spotify?: SpotifyDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LastfmDto)
  lastfm?: LastfmDto;
}

@Controller('admin/settings/providers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PERMISSIONS.CONTENT_MANAGE)
export class ProvidersSettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly config: ConfigService,
  ) {}

  private env(): IntegrationsConfig | undefined {
    return this.config.get<IntegrationsConfig>('integrations');
  }

  @Get()
  async get() {
    const env = this.env();
    return {
      spotify: {
        id: await this.settings.get<string>('providers.spotify.id', env?.spotifyClientId ?? ''),
        hasSecret:
          (await this.settings.hasSecret('providers.spotify.secret')) || Boolean(env?.spotifyClientSecret),
      },
      lastfm: {
        hasKey: (await this.settings.hasSecret('providers.lastfm.apiKey')) || Boolean(env?.lastfmApiKey),
      },
    };
  }

  @Put()
  async update(@Body() dto: UpdateProvidersDto) {
    const entries: { key: string; value: unknown }[] = [];
    if (dto.spotify) {
      entries.push({ key: 'providers.spotify.id', value: dto.spotify.id ?? '' });
      if (dto.spotify.secret) entries.push({ key: 'providers.spotify.secret', value: dto.spotify.secret });
    }
    if (dto.lastfm?.apiKey) {
      entries.push({ key: 'providers.lastfm.apiKey', value: dto.lastfm.apiKey });
    }
    if (entries.length > 0) await this.settings.setMany(entries);
    return { updated: true };
  }
}
