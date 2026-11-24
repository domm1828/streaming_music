import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class CatalogListDto extends PaginationQueryDto {
  @IsString()
  @IsOptional()
  search?: string;
}

export class CreateGenreDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @IsString()
  @IsOptional()
  image?: string;
}

export class UpdateGenreDto {
  @IsString()
  @IsOptional()
  displayName?: string;

  @IsString()
  @IsOptional()
  image?: string;
}

export class CreateArtistDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  genres?: string[];
}

export class UpdateArtistDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsBoolean()
  @IsOptional()
  verified?: boolean;

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  genres?: string[];
}

export class CreateAlbumDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsDateString()
  @IsOptional()
  releaseDate?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  artists?: string[];

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  genres?: string[];
}

export class UpdateAlbumDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsDateString()
  @IsOptional()
  releaseDate?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  artists?: string[];

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  genres?: string[];
}

export class CreateTrackDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsMongoId()
  @IsOptional()
  album?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  number?: number;

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  artists?: string[];

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  genres?: string[];

  /** Para pistas externas (youtube/hls): id de YouTube o URL. */
  @IsString()
  @IsOptional()
  src?: string;

  @IsEnum(['audio', 'youtube', 'hls', 'external'])
  @IsOptional()
  srcType?: 'audio' | 'youtube' | 'hls' | 'external';
}

export class UpdateTrackDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsMongoId()
  @IsOptional()
  album?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  number?: number;

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  artists?: string[];

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  genres?: string[];
}

export class UpsertLyricDto {
  @IsString()
  @IsNotEmpty()
  text!: string;

  @IsBoolean()
  @IsOptional()
  isSynced?: boolean;
}

export class LogPlayDto {
  @IsMongoId()
  trackId!: string;
}
