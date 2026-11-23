import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Comment } from './comment.schema';

export type VoteDocument = HydratedDocument<Vote>;

/** Voto de un usuario sobre un comentario (+1 / -1). */
@Schema({ timestamps: true, collection: 'votes' })
export class Vote {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  user!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Comment.name, required: true })
  comment!: Types.ObjectId;

  @Prop({ required: true, enum: [1, -1] })
  value!: number;
}

export const VoteSchema = SchemaFactory.createForClass(Vote);
VoteSchema.index({ user: 1, comment: 1 }, { unique: true });
