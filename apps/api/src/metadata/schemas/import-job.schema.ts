import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type ImportJobDocument = HydratedDocument<ImportJob>;

export type ImportJobType = 'artist' | 'newReleases' | 'featuredPlaylists' | 'topGenres';
export const IMPORT_JOB_TYPES: ImportJobType[] = ['artist', 'newReleases', 'featuredPlaylists', 'topGenres'];

export type ImportJobStatus = 'pending' | 'running' | 'done' | 'failed';

/** Estado de un trabajo de importación/scrapeo de metadatos. */
@Schema({ timestamps: true, collection: 'import_jobs' })
export class ImportJob {
  @Prop({ type: String, required: true, enum: IMPORT_JOB_TYPES })
  type!: ImportJobType;

  @Prop({ type: String, default: null })
  externalId!: string | null;

  @Prop({ type: String, required: true, enum: ['pending', 'running', 'done', 'failed'], default: 'pending' })
  status!: ImportJobStatus;

  @Prop({ default: 0 })
  processed!: number;

  @Prop({ default: 0 })
  total!: number;

  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  result!: unknown;

  @Prop({ type: String, default: null })
  error!: string | null;

  @Prop({ default: 0 })
  attempts!: number;

  @Prop({ type: Types.ObjectId, ref: User.name, default: null })
  createdBy!: Types.ObjectId | null;
}

export const ImportJobSchema = SchemaFactory.createForClass(ImportJob);
ImportJobSchema.index({ createdAt: -1 });
