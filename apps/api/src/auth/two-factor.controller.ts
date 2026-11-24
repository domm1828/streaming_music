import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthenticatedUser } from './types/authenticated-user';
import { UsersService } from '../users/users.service';
import { TwoFactorService } from './two-factor.service';

class TwoFactorCodeDto {
  @IsString()
  @IsNotEmpty()
  code!: string;
}

@Controller('me/2fa')
@UseGuards(JwtAuthGuard)
export class TwoFactorController {
  constructor(
    private readonly twoFactor: TwoFactorService,
    private readonly users: UsersService,
  ) {}

  @Get('status')
  async status(@CurrentUser() user: AuthenticatedUser) {
    const doc = await this.users.findById(user.id);
    return { enabled: doc ? this.twoFactor.isEnabled(doc) : false };
  }

  @Post('setup')
  @HttpCode(HttpStatus.OK)
  setup(@CurrentUser() user: AuthenticatedUser) {
    return this.twoFactor.setup(user.id, user.email);
  }

  @Post('enable')
  @HttpCode(HttpStatus.OK)
  enable(@Body() dto: TwoFactorCodeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.twoFactor.enable(user.id, dto.code);
  }

  @Post('disable')
  @HttpCode(HttpStatus.OK)
  async disable(@Body() dto: TwoFactorCodeDto, @CurrentUser() user: AuthenticatedUser) {
    await this.twoFactor.disable(user.id, dto.code);
    return { message: '2FA desactivado' };
  }
}
