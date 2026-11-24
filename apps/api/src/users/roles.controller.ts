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
  UseGuards,
} from '@nestjs/common';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PERMISSIONS } from '../auth/rbac/permissions';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';
import { RolesService } from './roles.service';

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly service: RolesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.USERS_VIEW)
  list() {
    return this.service.findAllWithCounts();
  }

  /** Catálogo de permisos asignables. */
  @Get('permissions')
  @RequirePermissions(PERMISSIONS.USERS_VIEW)
  permissions() {
    return this.service.listPermissions();
  }

  @Post()
  @RequirePermissions(PERMISSIONS.USERS_UPDATE)
  create(@Body() dto: CreateRoleDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.USERS_UPDATE)
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.USERS_DELETE)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return { message: 'Rol eliminado' };
  }
}
