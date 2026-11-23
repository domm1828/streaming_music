import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type CommentDocument = HydratedDocument<Comment>;
export type CommentableType = 'track' | 'album' | 'artist' | 'playlist';
export const COMMENTABLE_TYPES: CommentableType[] = ['track', 'album', 'artist', 'playlist'];

/** Comentario polimórfico con threading por `path`. */
@Schema({ timestamps: true, collection: 'comments' })
export class Comment {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  user!: Types.ObjectId;

  @Prop({ type: String, required: true, enum: COMMENTABLE_TYPES })
  commentableType!: CommentableType;

  @Prop({ type: Types.ObjectId, required: true })
  commentable!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  content!: string;

  @Prop({ type: Types.ObjectId, ref: Comment.name, default: null })
  parent!: Types.ObjectId | null;

  /** Ruta materializada para ordenar/anidar (ids separados por '/'). */
  @Prop({ default: '' })
  path!: string;

  @Prop({ default: 0 })
  votes!: number;

  @Prop({ type: Date, default: null })
  hiddenAt!: Date | null;

  createdAt?: Date;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);
CommentSchema.index({ commentableType: 1, commentable: 1, path: 1 });
