import { Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PERMISSIONS } from '../auth/rbac/permissions';
import { SearchQueryDto, SuggestQueryDto } from './dto/search.dto';
import { SEARCHABLE_TYPES } from './search.types';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly service: SearchService) {}

  @Get()
  async search(@Query() query: SearchQueryDto) {
    const q = query.q ?? '';
    if (query.type) {
      const { data, pagination } = await this.service.searchType(query.type, q, query.page, query.perPage);
      return { data, pagination };
    }
    return this.service.overview(q, SEARCHABLE_TYPES);
  }

  @Get('suggest')
  suggest(@Query() query: SuggestQueryDto) {
    return this.service.suggest(query.q ?? '', query.limit ?? 5);
  }

  /** Reindexa todo el catálogo en el motor de búsqueda (admin). */
  @Post('reindex')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_MANAGE)
  @HttpCode(HttpStatus.OK)
  async reindex() {
    const counts = await this.service.reindexAll();
    return { reindexed: counts, engine: this.service.usingMeili ? 'meilisearch' : 'mongo' };
  }
}
