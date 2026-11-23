import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsMongoId, IsOptional, Max, Min } from 'class-validator';
import type { RadioSeed } from '../radio.service';

export class RadioQueryDto {
  @IsEnum(['track', 'artist', 'genre'])
  seedType!: RadioSeed;

  @IsMongoId()
  seedId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  limit?: number;
}
