import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TagDocument = HydratedDocument<Tag>;

@Schema({ timestamps: true, collection: 'tags' })
export class Tag {
  /** Slug único en minúsculas (para búsqueda/relación). */
  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  name!: string;

  @Prop({ required: true, trim: true })
  displayName!: string;

  /** Color de acento opcional (hex) para los chips. */
  @Prop({ type: String, default: null })
  color!: string | null;

  @Prop({ type: String, default: null })
  description!: string | null;
}

export const TagSchema = SchemaFactory.createForClass(Tag);
