import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class GenerateImageDto {
  @IsString()
  @Length(3, 500)
  prompt!: string;

  @Type(() => Number)
  @IsInt()
  @Min(64)
  @Max(2048)
  @IsOptional()
  width?: number;

  @Type(() => Number)
  @IsInt()
  @Min(64)
  @Max(2048)
  @IsOptional()
  height?: number;

  @IsString()
  @IsOptional()
  model?: string;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  seed?: number;
}
