import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type LikeDocument = HydratedDocument<Like>;
export type LikeableType = 'track' | 'album' | 'artist' | 'playlist';
export const LIKEABLE_TYPES: LikeableType[] = ['track', 'album', 'artist', 'playlist'];

/** Like polimórfico: un usuario marca como favorito cualquier entidad del catálogo. */
@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'likes' })
export class Like {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  user!: Types.ObjectId;

  @Prop({ type: String, required: true, enum: LIKEABLE_TYPES })
  likeableType!: LikeableType;

  @Prop({ type: Types.ObjectId, required: true })
  likeable!: Types.ObjectId;

  /** Gestionado por timestamps; declarado para el tipado de lean. */
  createdAt?: Date;
}

export const LikeSchema = SchemaFactory.createForClass(Like);
// Un usuario no puede dar like dos veces a la misma entidad.
LikeSchema.index({ user: 1, likeableType: 1, likeable: 1 }, { unique: true });
// Para contar/listar quién marcó una entidad.
LikeSchema.index({ likeableType: 1, likeable: 1 });
