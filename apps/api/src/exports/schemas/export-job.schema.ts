import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type ExportJobDocument = HydratedDocument<ExportJob>;
export type ExportType = 'users' | 'tracks' | 'reports';
export const EXPORT_TYPES: ExportType[] = ['users', 'tracks', 'reports'];
export type ExportStatus = 'pending' | 'running' | 'done' | 'failed';

/** Trabajo de exportación CSV asíncrono. */
@Schema({ timestamps: true, collection: 'export_jobs' })
export class ExportJob {
  @Prop({ type: String, required: true, enum: EXPORT_TYPES })
  type!: ExportType;

  @Prop({ type: String, required: true, enum: ['pending', 'running', 'done', 'failed'], default: 'pending' })
  status!: ExportStatus;

  @Prop({ type: String, default: null })
  filePath!: string | null;

  @Prop({ default: 0 })
  rows!: number;

  @Prop({ type: String, default: null })
  error!: string | null;

  @Prop({ type: Types.ObjectId, ref: User.name, default: null })
  createdBy!: Types.ObjectId | null;

  createdAt?: Date;
}

export const ExportJobSchema = SchemaFactory.createForClass(ExportJob);
ExportJobSchema.index({ createdAt: -1 });
