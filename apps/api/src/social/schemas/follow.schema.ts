import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type FollowDocument = HydratedDocument<Follow>;
export type FollowableType = 'user' | 'artist' | 'playlist';
export const FOLLOWABLE_TYPES: FollowableType[] = ['user', 'artist', 'playlist'];

/** Follow polimórfico: un usuario sigue a otro usuario, a un artista o a una playlist. */
@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'follows' })
export class Follow {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  follower!: Types.ObjectId;

  @Prop({ type: String, required: true, enum: FOLLOWABLE_TYPES })
  followableType!: FollowableType;

  @Prop({ type: Types.ObjectId, required: true })
  followable!: Types.ObjectId;

  /** Gestionado por timestamps; declarado para el tipado de lean. */
  createdAt?: Date;
}

export const FollowSchema = SchemaFactory.createForClass(Follow);
// No se puede seguir dos veces la misma entidad.
FollowSchema.index({ follower: 1, followableType: 1, followable: 1 }, { unique: true });
// Para listar seguidores de una entidad.
FollowSchema.index({ followableType: 1, followable: 1 });
