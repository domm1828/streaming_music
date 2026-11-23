import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type GenreDocument = HydratedDocument<Genre>;

@Schema({ timestamps: true, collection: 'genres' })
export class Genre {
  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  name!: string;

  @Prop({ required: true, trim: true })
  displayName!: string;

  @Prop({ type: String, default: null })
  image!: string | null;

  @Prop({ default: 0 })
  popularity!: number;
}

export const GenreSchema = SchemaFactory.createForClass(Genre);
