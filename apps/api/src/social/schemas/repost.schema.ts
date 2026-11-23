import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type RepostDocument = HydratedDocument<Repost>;
export type RepostableType = 'track' | 'playlist';
export const REPOSTABLE_TYPES: RepostableType[] = ['track', 'playlist'];

/** Repost polimórfico: un usuario comparte una pista o playlist en su perfil. */
@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'reposts' })
export class Repost {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  user!: Types.ObjectId;

  @Prop({ type: String, required: true, enum: REPOSTABLE_TYPES })
  repostableType!: RepostableType;

  @Prop({ type: Types.ObjectId, required: true })
  repostable!: Types.ObjectId;

  /** Gestionado por timestamps; declarado para el tipado de lean. */
  createdAt?: Date;
}

export const RepostSchema = SchemaFactory.createForClass(Repost);
// No se duplica el repost de la misma entidad.
RepostSchema.index({ user: 1, repostableType: 1, repostable: 1 }, { unique: true });
RepostSchema.index({ user: 1, createdAt: -1 });
