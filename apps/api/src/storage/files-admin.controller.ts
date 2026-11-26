import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Query, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PERMISSIONS } from '../auth/rbac/permissions';
import { FilesAdminService } from './files-admin.service';
import { ListFilesDto } from './dto/list-files.dto';

@Controller('admin/files')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PERMISSIONS.CATALOG_MANAGE)
export class FilesAdminController {
  constructor(private readonly service: FilesAdminService) {}

  @Get()
  list(@Query() query: ListFilesDto) {
    return this.service.list({ page: query.page, perPage: query.perPage, kind: query.kind, q: query.q });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return { message: 'Archivo eliminado' };
  }
}
