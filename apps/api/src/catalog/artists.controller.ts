import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PERMISSIONS } from '../auth/rbac/permissions';
import { ArtistsService } from './artists.service';
import { CatalogListDto, CreateArtistDto, UpdateArtistDto } from './dto/catalog.dto';

@Controller('artists')
export class ArtistsController {
  constructor(private readonly service: ArtistsService) {}

  @Get()
  list(@Query() query: CatalogListDto) {
    return this.service.list(query.page, query.perPage, query.search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findByIdOrFail(id);
  }

  @Get(':id/albums')
  albums(@Param('id') id: string, @Query() query: CatalogListDto) {
    return this.service.albums(id, query.page, query.perPage);
  }

  @Get(':id/tracks')
  tracks(@Param('id') id: string, @Query() query: CatalogListDto) {
    return this.service.tracks(id, query.page, query.perPage);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOG_MANAGE)
  create(@Body() dto: CreateArtistDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOG_MANAGE)
  update(@Param('id') id: string, @Body() dto: UpdateArtistDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOG_MANAGE)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return { message: 'Artista eliminado' };
  }
}
