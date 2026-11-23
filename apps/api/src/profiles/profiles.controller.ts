import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { UpdateProfileDto } from '../users/dto/update-profile.dto';
import { ProfilesService } from './profiles.service';

@Controller()
export class ProfilesController {
  constructor(private readonly service: ProfilesService) {}

  /** Actualiza el perfil del usuario autenticado. */
  @Patch('me/profile')
  @UseGuards(JwtAuthGuard)
  updateOwn(@Body() dto: UpdateProfileDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.updateOwn(user.id, dto);
  }

  /** Perfil público de un usuario por su username. */
  @Get('profiles/:username')
  @UseGuards(OptionalJwtAuthGuard)
  getByUsername(@Param('username') username: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.service.getByUsername(username, user?.id);
  }
}
