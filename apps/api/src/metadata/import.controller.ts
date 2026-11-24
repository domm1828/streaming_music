import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PERMISSIONS } from '../auth/rbac/permissions';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { ImportArtistDto, ProviderSearchDto } from './dto/import.dto';
import { ImportService } from './import.service';
import { LyricsImportService } from './lyrics-import.service';

/** Flujos de importación de metadatos (admin). */
@Controller('admin/import')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PERMISSIONS.CONTENT_MANAGE)
export class ImportController {
  constructor(
    private readonly service: ImportService,
    private readonly lyrics: LyricsImportService,
  ) {}

  /** Estado de las integraciones (para habilitar/deshabilitar la UI). */
  @Get('status')
  status() {
    return {
      providerConfigured: this.service.providerConfigured(),
      lyricsSources: this.lyrics.sources,
    };
  }

  @Get('search')
  search(@Query() query: ProviderSearchDto) {
    return this.service.searchArtists(query.q);
  }

  @Get('jobs')
  jobs() {
    return this.service.listJobs();
  }

  @Get('jobs/:id')
  async job(@Param('id') id: string) {
    const job = await this.service.getJob(id);
    if (!job) throw new NotFoundException('Job no encontrado');
    return job;
  }

  @Post('artist')
  @HttpCode(HttpStatus.ACCEPTED)
  importArtist(@Body() dto: ImportArtistDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.createAndRun('artist', dto.externalId, user.id);
  }

  @Post('new-releases')
  @HttpCode(HttpStatus.ACCEPTED)
  newReleases(@CurrentUser() user: AuthenticatedUser) {
    return this.service.createAndRun('newReleases', null, user.id);
  }

  @Post('featured-playlists')
  @HttpCode(HttpStatus.ACCEPTED)
  featuredPlaylists(@CurrentUser() user: AuthenticatedUser) {
    return this.service.createAndRun('featuredPlaylists', null, user.id);
  }

  @Post('top-genres')
  @HttpCode(HttpStatus.ACCEPTED)
  topGenres(@CurrentUser() user: AuthenticatedUser) {
    return this.service.createAndRun('topGenres', null, user.id);
  }

  /** Busca y guarda la letra de una pista desde los proveedores configurados. */
  @Post('lyrics/:trackId')
  @HttpCode(HttpStatus.OK)
  fetchLyrics(@Param('trackId') trackId: string) {
    return this.lyrics.fetchForTrack(trackId);
  }
}
