import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthenticatedUser } from './types/authenticated-user';
import { ApiTokensService } from './api-tokens.service';

class CreateApiTokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;
}

@Controller('account/api-tokens')
@UseGuards(JwtAuthGuard)
export class ApiTokensController {
  constructor(private readonly service: ApiTokensService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.service.list(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateApiTokenDto) {
    return this.service.create(user.id, dto.name);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async revoke(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    await this.service.revoke(user.id, id);
    return { message: 'Token revocado' };
  }
}
