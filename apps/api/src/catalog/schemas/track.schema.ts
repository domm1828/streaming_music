import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Album } from './album.schema';
import { Artist } from './artist.schema';
import { Genre } from './genre.schema';
import { User } from '../../users/schemas/user.schema';

export type TrackDocument = HydratedDocument<Track>;
export type TrackSrcType = 'audio' | 'youtube' | 'hls' | 'external';

@Schema({ _id: false })
export class TrackArtistRef {
  @Prop({ type: Types.ObjectId, ref: Artist.name, required: true })
  artist!: Types.ObjectId;

  @Prop({ default: false })
  primary!: boolean;
}
const TrackArtistRefSchema = SchemaFactory.createForClass(TrackArtistRef);

@Schema({ timestamps: true, collection: 'tracks' })
export class Track {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ type: Types.ObjectId, ref: Album.name, default: null })
  album!: Types.ObjectId | null;

  @Prop({ default: 1 })
  number!: number;

  /** Duración en segundos. */
  @Prop({ default: 0 })
  duration!: number;

  /** Fuente reproducible: ruta del archivo subido, id de YouTube o URL HLS. */
  @Prop({ type: String, default: null })
  src!: string | null;

  @Prop({ type: String, required: true, enum: ['audio', 'youtube', 'hls', 'external'], default: 'audio' })
  srcType!: TrackSrcType;

  @Prop({ type: String, default: null })
  image!: string | null;

  @Prop({ type: String, default: null })
  waveformPath!: string | null;

  @Prop({ type: String, default: null, index: true })
  spotifyId!: string | null;

  @Prop({ default: 0 })
  popularity!: number;

  @Prop({ default: 0 })
  plays!: number;

  @Prop({ type: Types.ObjectId, ref: User.name, default: null })
  owner!: Types.ObjectId | null;

  @Prop({ type: [TrackArtistRefSchema], default: [] })
  artists!: TrackArtistRef[];

  @Prop({ type: [{ type: Types.ObjectId, ref: Genre.name }], default: [] })
  genres!: Types.ObjectId[];
}

export const TrackSchema = SchemaFactory.createForClass(Track);
TrackSchema.index({ name: 'text' });
TrackSchema.index({ 'artists.artist': 1 });
