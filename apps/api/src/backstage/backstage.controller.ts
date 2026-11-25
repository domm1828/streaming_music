import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { IsEnum, IsIn, IsMongoId, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PERMISSIONS } from '../auth/rbac/permissions';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import type { BackstageStatus } from './schemas/backstage-request.schema';
import { BackstageService, type UploadedAttachment } from './backstage.service';

class SubmitBackstageDto {
  @IsEnum(['claim', 'new'])
  type!: 'claim' | 'new';

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  artistName!: string;

  @IsMongoId()
  @IsOptional()
  artistId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  message?: string;
}

class ReviewDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  note?: string;
}

class ListBackstageDto extends PaginationQueryDto {
  @IsIn(['pending', 'approved', 'rejected'])
  @IsOptional()
  status?: BackstageStatus;
}

@Controller()
export class BackstageController {
  constructor(private readonly service: BackstageService) {}

  @Post('backstage')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('attachments', 5))
  submit(
    @Body() dto: SubmitBackstageDto,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const attachments: UploadedAttachment[] = (files ?? []).map((f) => ({
      buffer: f.buffer,
      originalname: f.originalname,
      mimetype: f.mimetype,
    }));
    return this.service.submit(user.id, dto, attachments);
  }

  @Get('me/backstage')
  @UseGuards(JwtAuthGuard)
  mine(@Query() query: PaginationQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.listMine(user.id, query.page, query.perPage);
  }

  @Get('admin/backstage')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_MANAGE)
  listAll(@Query() query: ListBackstageDto) {
    return this.service.listAll(query.status, query.page, query.perPage);
  }

  @Get('admin/backstage/:id/attachments')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_MANAGE)
  attachments(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.attachmentUrls(id, { id: user.id, isAdmin: true });
  }

  @Post('admin/backstage/:id/approve')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_MANAGE)
  @HttpCode(HttpStatus.OK)
  approve(@Param('id') id: string, @Body() dto: ReviewDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.approve(id, user.id, dto.note);
  }

  @Post('admin/backstage/:id/reject')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_MANAGE)
  @HttpCode(HttpStatus.OK)
  reject(@Param('id') id: string, @Body() dto: ReviewDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.reject(id, user.id, dto.note);
  }
}
