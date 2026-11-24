import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PERMISSIONS } from '../auth/rbac/permissions';
import { SemanticService } from './semantic.service';

@Controller()
export class AiController {
  constructor(private readonly semantic: SemanticService) {}

  /** Búsqueda semántica (cae a vacío si el proveedor de IA no está configurado). */
  @Get('semantic/search')
  search(@Query('q') q: string | undefined, @Query('limit') limit: string | undefined) {
    return this.semantic.search(q ?? '', limit ? parseInt(limit, 10) : 20);
  }

  /** Pistas similares por embedding. */
  @Get('tracks/:id/similar')
  similar(@Param('id') id: string) {
    return this.semantic.similar(id);
  }

  @Get('admin/ai/status')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_MANAGE)
  status() {
    return { configured: this.semantic.isConfigured() };
  }

  @Post('admin/ai/embeddings')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_MANAGE)
  @HttpCode(HttpStatus.OK)
  generate() {
    return this.semantic.generateMissing();
  }
}
