import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type ListenUsageDocument = HydratedDocument<ListenUsage>;

/**
 * Minutos escuchados acumulados por usuario y periodo (YYYY-MM).
 * Se usa para el límite de minutos de los planes (Phase 6).
 */
@Schema({ timestamps: true, collection: 'listen_usage' })
export class ListenUsage {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  user!: Types.ObjectId;

  /** Periodo en formato YYYY-MM (mensual). */
  @Prop({ required: true })
  period!: string;

  /** Segundos de escucha acumulados en el periodo. */
  @Prop({ default: 0 })
  seconds!: number;
}

export const ListenUsageSchema = SchemaFactory.createForClass(ListenUsage);
ListenUsageSchema.index({ user: 1, period: 1 }, { unique: true });
