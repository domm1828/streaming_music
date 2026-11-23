import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreatePlaylistDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsBoolean()
  @IsOptional()
  public?: boolean;

  @IsBoolean()
  @IsOptional()
  collaborative?: boolean;
}

export class UpdatePlaylistDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsBoolean()
  @IsOptional()
  public?: boolean;

  @IsBoolean()
  @IsOptional()
  collaborative?: boolean;
}

export class AddTracksDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  trackIds!: string[];
}

/** Lista completa y ordenada de pistas; reconstruye las posiciones. */
export class ReorderTracksDto {
  @IsArray()
  @IsMongoId({ each: true })
  trackIds!: string[];
}

/** Define el conjunto de editores (colaboradores) de la playlist. */
export class SetEditorsDto {
  @IsArray()
  @IsMongoId({ each: true })
  userIds!: string[];
}
