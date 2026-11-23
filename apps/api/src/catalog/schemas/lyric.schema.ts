import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Track } from './track.schema';

export type LyricDocument = HydratedDocument<Lyric>;

@Schema({ timestamps: true, collection: 'lyrics' })
export class Lyric {
  @Prop({ type: Types.ObjectId, ref: Track.name, required: true, unique: true })
  track!: Types.ObjectId;

  @Prop({ required: true })
  text!: string;

  /** True si la letra está sincronizada con el tiempo (formato LRC). */
  @Prop({ default: false })
  isSynced!: boolean;

  /** Fuente de la que se obtuvo (proveedor externo o 'manual'). */
  @Prop({ type: String, default: 'manual' })
  source!: string;
}

export const LyricSchema = SchemaFactory.createForClass(Lyric);
