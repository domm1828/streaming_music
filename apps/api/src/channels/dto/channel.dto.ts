import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CHANNEL_LAYOUTS, CHANNEL_SOURCE_TYPES, ChannelLayout, ChannelSourceType } from '../schemas/channel.schema';

export class ChannelConfigDto {
  @IsEnum(CHANNEL_SOURCE_TYPES)
  sourceType!: ChannelSourceType;

  @IsObject()
  @IsOptional()
  params?: Record<string, unknown>;

  @IsEnum(CHANNEL_LAYOUTS)
  @IsOptional()
  layout?: ChannelLayout;
}

export class ContentItemDto {
  @IsEnum(['track', 'album', 'artist', 'playlist'])
  refType!: 'track' | 'album' | 'artist' | 'playlist';

  @IsMongoId()
  refId!: string;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  order?: number;
}

export class CreateChannelDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @ValidateNested()
  @Type(() => ChannelConfigDto)
  config!: ChannelConfigDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContentItemDto)
  @IsOptional()
  content?: ContentItemDto[];

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  position?: number;

  @IsBoolean()
  @IsOptional()
  public?: boolean;

  @IsBoolean()
  @IsOptional()
  internal?: boolean;
}

export class UpdateChannelDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @ValidateNested()
  @Type(() => ChannelConfigDto)
  @IsOptional()
  config?: ChannelConfigDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContentItemDto)
  @IsOptional()
  content?: ContentItemDto[];

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  position?: number;

  @IsBoolean()
  @IsOptional()
  public?: boolean;

  @IsBoolean()
  @IsOptional()
  internal?: boolean;
}
