import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Track } from '../../catalog/schemas/track.schema';
import { User } from '../../users/schemas/user.schema';

export type PlaylistDocument = HydratedDocument<Playlist>;

/** Pista dentro de una playlist, con su posición y quién la agregó. */
@Schema({ _id: false })
export class PlaylistTrack {
  @Prop({ type: Types.ObjectId, ref: Track.name, required: true })
  track!: Types.ObjectId;

  @Prop({ default: 0 })
  position!: number;

  @Prop({ type: Types.ObjectId, ref: User.name, default: null })
  addedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: () => new Date() })
  addedAt!: Date;
}
const PlaylistTrackSchema = SchemaFactory.createForClass(PlaylistTrack);

@Schema({ timestamps: true, collection: 'playlists' })
export class Playlist {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ type: String, default: null })
  description!: string | null;

  @Prop({ type: String, default: null })
  image!: string | null;

  @Prop({ default: true })
  public!: boolean;

  @Prop({ default: false })
  collaborative!: boolean;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  owner!: Types.ObjectId;

  @Prop({ type: [PlaylistTrackSchema], default: [] })
  tracks!: PlaylistTrack[];

  /** Usuarios con permiso de edición (además del dueño) en playlists colaborativas. */
  @Prop({ type: [{ type: Types.ObjectId, ref: User.name }], default: [] })
  editors!: Types.ObjectId[];

  @Prop({ default: 0 })
  followersCount!: number;
}

export const PlaylistSchema = SchemaFactory.createForClass(Playlist);
PlaylistSchema.index({ name: 'text' });
