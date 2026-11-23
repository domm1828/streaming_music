import { IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { LIKEABLE_TYPES, LikeableType } from '../schemas/like.schema';
import { FOLLOWABLE_TYPES, FollowableType } from '../schemas/follow.schema';
import { REPOSTABLE_TYPES, RepostableType } from '../schemas/repost.schema';

export class LikeDto {
  @IsEnum(LIKEABLE_TYPES)
  type!: LikeableType;

  @IsMongoId()
  id!: string;
}

export class LikesQueryDto extends PaginationQueryDto {
  @IsEnum(LIKEABLE_TYPES)
  @IsOptional()
  type?: LikeableType;
}

export class FollowDto {
  @IsEnum(FOLLOWABLE_TYPES)
  type!: FollowableType;

  @IsMongoId()
  id!: string;
}

export class FollowingQueryDto extends PaginationQueryDto {
  @IsEnum(FOLLOWABLE_TYPES)
  @IsOptional()
  type?: FollowableType;
}

export class RepostDto {
  @IsEnum(REPOSTABLE_TYPES)
  type!: RepostableType;

  @IsMongoId()
  id!: string;
}
