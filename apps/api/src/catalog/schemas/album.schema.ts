import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Artist } from './artist.schema';
import { Genre } from './genre.schema';
import { User } from '../../users/schemas/user.schema';

export type AlbumDocument = HydratedDocument<Album>;

@Schema({ timestamps: true, collection: 'albums' })
export class Album {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ type: Date, default: null })
  releaseDate!: Date | null;

  @Prop({ type: String, default: null })
  image!: string | null;

  @Prop({ type: String, default: null })
  description!: string | null;

  @Prop({ type: String, default: null, index: true })
  spotifyId!: string | null;

  @Prop({ default: 0 })
  popularity!: number;

  @Prop({ type: Types.ObjectId, ref: User.name, default: null })
  owner!: Types.ObjectId | null;

  @Prop({ type: [{ type: Types.ObjectId, ref: Artist.name }], default: [] })
  artists!: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: Genre.name }], default: [] })
  genres!: Types.ObjectId[];

  @Prop({ default: 0 })
  plays!: number;

  @Prop({ default: 0 })
  views!: number;

  @Prop({ default: false })
  fullyScraped!: boolean;
}

export const AlbumSchema = SchemaFactory.createForClass(Album);
AlbumSchema.index({ name: 'text' });
AlbumSchema.index({ createdAt: -1 }); // feed de novedades
AlbumSchema.index({ artists: 1 });
