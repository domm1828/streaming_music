import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Genre } from './genre.schema';

export type ArtistDocument = HydratedDocument<Artist>;

@Schema({ timestamps: true, collection: 'artists' })
export class Artist {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  slug!: string;

  @Prop({ type: String, default: null })
  image!: string | null;

  @Prop({ type: String, default: null })
  bio!: string | null;

  @Prop({ type: String, default: null, index: true })
  spotifyId!: string | null;

  @Prop({ default: 0 })
  spotifyFollowers!: number;

  @Prop({ default: 0 })
  spotifyPopularity!: number;

  @Prop({ default: false })
  verified!: boolean;

  @Prop({ default: false })
  disabled!: boolean;

  @Prop({ default: false })
  fullyScraped!: boolean;

  @Prop({ default: 0 })
  views!: number;

  /** Seguidores dentro de la plataforma (distinto de spotifyFollowers). */
  @Prop({ default: 0 })
  followers!: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: Genre.name }], default: [] })
  genres!: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: Artist.name }], default: [] })
  similar!: Types.ObjectId[];
}

export const ArtistSchema = SchemaFactory.createForClass(Artist);
ArtistSchema.index({ name: 'text' });
ArtistSchema.index({ followers: -1, views: -1 }); // artistas populares
