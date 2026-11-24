import { IsEnum, IsIn, IsMongoId, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { COMMENTABLE_TYPES, CommentableType } from '../schemas/comment.schema';
import { REPORTABLE_TYPES, ReportableType, ReportStatus } from '../schemas/report.schema';

export class ListReportsDto extends PaginationQueryDto {
  @IsIn(['open', 'resolved', 'dismissed'])
  @IsOptional()
  status?: ReportStatus;
}

export class CommentsQueryDto extends PaginationQueryDto {
  @IsEnum(COMMENTABLE_TYPES)
  type!: CommentableType;

  @IsMongoId()
  id!: string;
}

export class CreateCommentDto {
  @IsEnum(COMMENTABLE_TYPES)
  type!: CommentableType;

  @IsMongoId()
  id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content!: string;

  @IsMongoId()
  @IsOptional()
  parentId?: string;
}

export class VoteDto {
  @IsIn([1, -1])
  value!: number;
}

export class CreateReportDto {
  @IsEnum(REPORTABLE_TYPES)
  type!: ReportableType;

  @IsMongoId()
  id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}

export class ResolveReportDto {
  @IsIn(['resolved', 'dismissed'])
  status!: 'resolved' | 'dismissed';

  @IsString()
  @IsOptional()
  @MaxLength(500)
  resolution?: string;

  /** Acción opcional sobre el contenido: `hide` oculta el comentario reportado. */
  @IsIn(['hide', 'none'])
  @IsOptional()
  action?: 'hide' | 'none';
}
