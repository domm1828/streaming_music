import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PERMISSIONS } from '../auth/rbac/permissions';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { AlbumsService } from './albums.service';
import { CatalogListDto, CreateAlbumDto, UpdateAlbumDto } from './dto/catalog.dto';

@Controller('albums')
export class AlbumsController {
  constructor(private readonly service: AlbumsService) {}

  @Get()
  list(@Query() query: CatalogListDto) {
    return this.service.list(query.page, query.perPage, query.search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findWithTracks(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOG_MANAGE)
  create(@Body() dto: CreateAlbumDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOG_MANAGE)
  update(@Param('id') id: string, @Body() dto: UpdateAlbumDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOG_MANAGE)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return { message: 'Álbum eliminado' };
  }
}
