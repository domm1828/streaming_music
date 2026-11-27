import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
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

export class CreateTagDto {
  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateTagDto {
  @IsString()
  @IsOptional()
  displayName?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  description?: string;
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

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  similar?: string[];
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

export class AlbumTracksOrderDto {
  @IsArray()
  @IsMongoId({ each: true })
  trackIds!: string[];
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

  @IsString()
  @IsOptional()
  image?: string;

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

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  image?: string;
}

export class BulkUpdateTracksDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  trackIds!: string[];

  /** Campos a aplicar; los ausentes no se tocan. Los multivaluados reemplazan. */
  @IsMongoId()
  @IsOptional()
  album?: string;

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  artists?: string[];

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  genres?: string[];

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  image?: string;
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
