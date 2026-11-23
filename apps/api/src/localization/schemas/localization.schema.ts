import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type LocalizationDocument = HydratedDocument<Localization>;

/** Conjunto de cadenas traducidas para un idioma. */
@Schema({ timestamps: true, collection: 'localizations' })
export class Localization {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  locale!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  lines!: Record<string, string>;

  @Prop({ default: false })
  isDefault!: boolean;
}

export const LocalizationSchema = SchemaFactory.createForClass(Localization);
