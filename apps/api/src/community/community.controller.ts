import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PERMISSIONS } from '../auth/rbac/permissions';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import {
  CommentsQueryDto,
  CreateCommentDto,
  CreateReportDto,
  ListReportsDto,
  ResolveReportDto,
  VoteDto,
} from './dto/community.dto';
import { CommentsService } from './comments.service';
import { ReportsService } from './reports.service';

@Controller()
export class CommunityController {
  constructor(
    private readonly comments: CommentsService,
    private readonly reports: ReportsService,
  ) {}

  // --- Comentarios ---
  @Get('comments')
  list(@Query() query: CommentsQueryDto) {
    return this.comments.listForContent(query.type, query.id, query.page, query.perPage);
  }

  @Post('comments')
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateCommentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.comments.create(user.id, dto.type, dto.id, dto.content, dto.parentId);
  }

  @Post('comments/:id/vote')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  vote(@Param('id') id: string, @Body() dto: VoteDto, @CurrentUser() user: AuthenticatedUser) {
    return this.comments.vote(id, user.id, dto.value);
  }

  @Delete('comments/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.comments.remove(id, user);
    return { message: 'Comentario eliminado' };
  }

  @Post('comments/:id/hide')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_MANAGE)
  @HttpCode(HttpStatus.OK)
  async hide(@Param('id') id: string) {
    await this.comments.hide(id);
    return { message: 'Comentario oculto' };
  }

  // --- Reportes ---
  @Post('reports')
  @UseGuards(JwtAuthGuard)
  report(@Body() dto: CreateReportDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reports.create(user.id, dto.type, dto.id, dto.reason);
  }

  @Get('admin/reports')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_MANAGE)
  listReports(@Query() query: ListReportsDto) {
    return this.reports.list(query.status, query.page, query.perPage);
  }

  @Post('admin/reports/:id/resolve')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_MANAGE)
  @HttpCode(HttpStatus.OK)
  resolve(@Param('id') id: string, @Body() dto: ResolveReportDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reports.resolve(id, user.id, dto.status, dto.resolution);
  }
}
