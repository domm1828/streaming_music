import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PERMISSIONS } from '../auth/rbac/permissions';
import { CustomPagesService } from './custom-pages.service';
import { SitemapService } from './sitemap.service';

class CreatePageDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  body?: string;

  @IsBoolean()
  @IsOptional()
  published?: boolean;
}

class UpdatePageDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  body?: string;

  @IsBoolean()
  @IsOptional()
  published?: boolean;
}

@Controller()
export class CmsController {
  constructor(
    private readonly pages: CustomPagesService,
    private readonly sitemap: SitemapService,
  ) {}

  // --- SEO ---
  @Get('sitemap.xml')
  async sitemapXml(@Res() res: Response) {
    const xml = await this.sitemap.generate();
    res.header('Content-Type', 'application/xml').send(xml);
  }

  @Get('seo')
  seo(@Query('type') type: string, @Query('id') id: string) {
    return this.sitemap.meta(type, id);
  }

  // --- Páginas públicas ---
  @Get('pages')
  listPublic() {
    return this.pages.listPublic();
  }

  @Get('pages/:slug')
  bySlug(@Param('slug') slug: string) {
    return this.pages.getBySlug(slug);
  }

  // --- Admin ---
  @Get('admin/pages')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_MANAGE)
  listAll() {
    return this.pages.listAll();
  }

  @Post('admin/pages')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_MANAGE)
  create(@Body() dto: CreatePageDto) {
    return this.pages.create({ ...dto, body: dto.body ?? '' });
  }

  @Patch('admin/pages/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_MANAGE)
  update(@Param('id') id: string, @Body() dto: UpdatePageDto) {
    return this.pages.update(id, dto);
  }

  @Delete('admin/pages/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_MANAGE)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    await this.pages.remove(id);
    return { message: 'Página eliminada' };
  }
}
