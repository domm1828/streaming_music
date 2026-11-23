import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ProfileLinkDto {
  @IsString()
  @MaxLength(40)
  label!: string;

  @IsString()
  @MaxLength(300)
  url!: string;
}

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  @MaxLength(80)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  bio?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsString()
  @IsOptional()
  coverImage?: string;

  @IsString()
  @IsOptional()
  @MaxLength(60)
  country?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProfileLinkDto)
  @IsOptional()
  links?: ProfileLinkDto[];
}
