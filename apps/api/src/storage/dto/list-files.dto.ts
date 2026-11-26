import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { MEDIA_KINDS, MediaKind } from '../file-entry.schema';

/** Filtros de la biblioteca de medios: ?kind=image&q=portada */
export class ListFilesDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(MEDIA_KINDS)
  kind?: MediaKind;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}
