import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PERMISSIONS } from '../auth/rbac/permissions';
import { ListUsersDto } from './dto/list-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.USERS_VIEW)
  list(@Query() query: ListUsersDto) {
    return this.usersService.list(query.page, query.perPage, query.search);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.USERS_VIEW)
  async getOne(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.USERS_UPDATE)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.USERS_DELETE)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
    return { message: 'Usuario eliminado' };
  }

  @Post(':id/ban')
  @RequirePermissions(PERMISSIONS.USERS_BAN)
  @HttpCode(HttpStatus.OK)
  ban(@Param('id') id: string) {
    return this.usersService.setBanned(id, true);
  }

  @Post(':id/unban')
  @RequirePermissions(PERMISSIONS.USERS_BAN)
  @HttpCode(HttpStatus.OK)
  unban(@Param('id') id: string) {
    return this.usersService.setBanned(id, false);
  }
}
