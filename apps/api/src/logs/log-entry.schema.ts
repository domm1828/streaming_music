import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type LogLevel = 'error' | 'email';
export type LogEntryDocument = HydratedDocument<LogEntry>;

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'logs' })
export class LogEntry {
  @Prop({ type: String, required: true, index: true })
  level!: LogLevel;

  @Prop({ required: true })
  message!: string;

  @Prop({ type: String, default: null })
  context!: string | null;

  @Prop({ type: Object, default: null })
  meta!: Record<string, unknown> | null;
}

export const LogEntrySchema = SchemaFactory.createForClass(LogEntry);
LogEntrySchema.index({ level: 1, createdAt: -1 });
