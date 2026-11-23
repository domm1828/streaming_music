import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ImportArtistDto {
  /** Id del artista en el proveedor externo (p. ej. Spotify). */
  @IsString()
  @IsNotEmpty()
  externalId!: string;

  @IsBoolean()
  @IsOptional()
  force?: boolean;
}

export class ProviderSearchDto {
  @IsString()
  @IsNotEmpty()
  q!: string;
}
