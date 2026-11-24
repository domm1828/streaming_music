import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CustomPageDocument = HydratedDocument<CustomPage>;

/** Página editable del CMS (términos, contacto, ayuda, etc.). */
@Schema({ timestamps: true, collection: 'custom_pages' })
export class CustomPage {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug!: string;

  @Prop({ required: true, trim: true })
  title!: string;

  /** Contenido enriquecido (HTML). */
  @Prop({ default: '' })
  body!: string;

  @Prop({ default: true })
  published!: boolean;

  updatedAt?: Date;
}

export const CustomPageSchema = SchemaFactory.createForClass(CustomPage);
