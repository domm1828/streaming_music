import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type RefreshTokenDocument = HydratedDocument<RefreshToken>;

/**
 * Refresh token rotativo. Se guarda sólo el hash del token.
 * Cada fila es también una "sesión" del usuario.
 */
@Schema({ timestamps: true, collection: 'refresh_tokens' })
export class RefreshToken {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  user!: Types.ObjectId;

  @Prop({ required: true, index: true })
  tokenHash!: string;

  @Prop({ required: true })
  expiresAt!: Date;

  @Prop({ type: Date, default: null })
  revokedAt!: Date | null;

  /** id del token que reemplazó a éste al rotar. */
  @Prop({ type: Types.ObjectId, ref: RefreshToken.name, default: null })
  replacedBy!: Types.ObjectId | null;

  @Prop({ type: String, default: null })
  userAgent!: string | null;

  @Prop({ type: String, default: null })
  ip!: string | null;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);
