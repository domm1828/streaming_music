import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import type { BroadcastAudience } from '../notifications.service';

export type AudienceKind = 'all' | 'verified' | 'role' | 'users';

/** Cuerpo de un broadcast admin. La audiencia se expresa de forma plana y se arma en el controller. */
export class BroadcastDto {
  @IsString()
  @MinLength(1)
  @MaxLength(140)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  body?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  link?: string;

  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @IsIn(['all', 'verified', 'role', 'users'])
  audience!: AudienceKind;

  @ValidateIf((o: BroadcastDto) => o.audience === 'role')
  @IsMongoId()
  roleId?: string;

  @ValidateIf((o: BroadcastDto) => o.audience === 'users')
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  userIds?: string[];
}

/** Traduce el DTO plano a la unión discriminada que consume el servicio. */
export function toAudience(dto: BroadcastDto): BroadcastAudience {
  switch (dto.audience) {
    case 'role':
      return { kind: 'role', roleId: dto.roleId! };
    case 'users':
      return { kind: 'users', userIds: dto.userIds! };
    case 'verified':
      return { kind: 'verified' };
    default:
      return { kind: 'all' };
  }
}
