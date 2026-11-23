import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Track } from './track.schema';
import { User } from '../../users/schemas/user.schema';

export type TrackPlayDocument = HydratedDocument<TrackPlay>;

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'track_plays' })
export class TrackPlay {
  @Prop({ type: Types.ObjectId, ref: User.name, default: null, index: true })
  user!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: Track.name, required: true, index: true })
  track!: Types.ObjectId;

  @Prop({ type: String, default: null })
  platform!: string | null;

  @Prop({ type: String, default: null })
  device!: string | null;

  @Prop({ type: String, default: null })
  country!: string | null;
}

export const TrackPlaySchema = SchemaFactory.createForClass(TrackPlay);
TrackPlaySchema.index({ track: 1, createdAt: -1 });
TrackPlaySchema.index({ user: 1, createdAt: -1 });
