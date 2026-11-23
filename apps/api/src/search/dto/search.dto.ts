import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { SEARCHABLE_TYPES, SearchableType } from '../search.types';

export class SearchQueryDto extends PaginationQueryDto {
  @IsString()
  @IsOptional()
  q?: string;

  @IsEnum(SEARCHABLE_TYPES)
  @IsOptional()
  type?: SearchableType;
}

export class SuggestQueryDto {
  @IsString()
  @IsOptional()
  q?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  @IsOptional()
  limit?: number;
}
