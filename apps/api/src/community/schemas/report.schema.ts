import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type ReportDocument = HydratedDocument<Report>;
export type ReportableType = 'comment' | 'track' | 'album' | 'artist' | 'playlist' | 'user';
export const REPORTABLE_TYPES: ReportableType[] = ['comment', 'track', 'album', 'artist', 'playlist', 'user'];
export type ReportStatus = 'open' | 'resolved' | 'dismissed';

/** Reporte de abuso sobre contenido o comentarios. */
@Schema({ timestamps: true, collection: 'reports' })
export class Report {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  reporter!: Types.ObjectId;

  @Prop({ type: String, required: true, enum: REPORTABLE_TYPES })
  reportableType!: ReportableType;

  @Prop({ type: Types.ObjectId, required: true })
  reportable!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  reason!: string;

  @Prop({ type: String, required: true, enum: ['open', 'resolved', 'dismissed'], default: 'open' })
  status!: ReportStatus;

  @Prop({ type: String, default: null })
  resolution!: string | null;

  @Prop({ type: Types.ObjectId, ref: User.name, default: null })
  resolvedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  resolvedAt!: Date | null;

  createdAt?: Date;
}

export const ReportSchema = SchemaFactory.createForClass(Report);
ReportSchema.index({ status: 1, createdAt: -1 });
