import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PERMISSIONS } from '../auth/rbac/permissions';
import { CreateGenreDto, UpdateGenreDto } from './dto/catalog.dto';
import { GenresService } from './genres.service';

@Controller('genres')
export class GenresController {
  constructor(private readonly service: GenresService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('with-stats')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOG_MANAGE)
  findAllWithStats() {
    return this.service.findAllWithStats();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findByIdOrFail(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOG_MANAGE)
  create(@Body() dto: CreateGenreDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOG_MANAGE)
  update(@Param('id') id: string, @Body() dto: UpdateGenreDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CATALOG_MANAGE)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return { message: 'Género eliminado' };
  }
}
