import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type ChannelDocument = HydratedDocument<Channel>;

export type ChannelSourceType =
  | 'topTracks'
  | 'newAlbums'
  | 'topArtists'
  | 'genreTracks'
  | 'publicPlaylists'
  | 'manual';

export const CHANNEL_SOURCE_TYPES: ChannelSourceType[] = [
  'topTracks',
  'newAlbums',
  'topArtists',
  'genreTracks',
  'publicPlaylists',
  'manual',
];

export type ChannelLayout = 'grid' | 'carousel' | 'list';

/** Ref de contenido para channels de fuente 'manual'. */
@Schema({ _id: false })
export class ChannelContentItem {
  @Prop({ type: String, required: true, enum: ['track', 'album', 'artist', 'playlist'] })
  refType!: 'track' | 'album' | 'artist' | 'playlist';

  @Prop({ type: Types.ObjectId, required: true })
  refId!: Types.ObjectId;

  @Prop({ default: 0 })
  order!: number;
}
const ChannelContentItemSchema = SchemaFactory.createForClass(ChannelContentItem);

/** Configuración de fuente + layout del bloque. */
@Schema({ _id: false })
export class ChannelConfig {
  @Prop({ type: String, required: true, enum: CHANNEL_SOURCE_TYPES, default: 'topTracks' })
  sourceType!: ChannelSourceType;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  params!: Record<string, unknown>;

  @Prop({ type: String, enum: ['grid', 'carousel', 'list'], default: 'grid' })
  layout!: ChannelLayout;
}
const ChannelConfigSchema = SchemaFactory.createForClass(ChannelConfig);

@Schema({ timestamps: true, collection: 'channels' })
export class Channel {
  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  slug!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  /** Agrupación de la página donde aparece (home, discover, …). */
  @Prop({ type: String, default: 'home' })
  type!: string;

  @Prop({ type: ChannelConfigSchema, default: () => ({}) })
  config!: ChannelConfig;

  /** Contenido cacheado (para fuentes manuales o resultado del refresco). */
  @Prop({ type: [ChannelContentItemSchema], default: [] })
  content!: ChannelContentItem[];

  @Prop({ default: 0 })
  position!: number;

  @Prop({ default: true })
  public!: boolean;

  /** Interno: no se expone en las páginas públicas. */
  @Prop({ default: false })
  internal!: boolean;

  @Prop({ type: Date, default: null })
  lastRefreshedAt!: Date | null;
}

export const ChannelSchema = SchemaFactory.createForClass(Channel);
ChannelSchema.index({ type: 1, position: 1 });
