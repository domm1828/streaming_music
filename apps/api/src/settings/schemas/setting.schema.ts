import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type SettingDocument = HydratedDocument<Setting>;

/** Almacén genérico clave/valor para configuración editable en runtime. */
@Schema({ timestamps: true, collection: 'settings' })
export class Setting {
  @Prop({ required: true, unique: true })
  key!: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  value!: unknown;

  /** Si es público, se expone en /bootstrap; si no, solo lo ve el admin. */
  @Prop({ default: false })
  isPublic!: boolean;

  @Prop({ type: String, default: 'general' })
  group!: string;
}

export const SettingSchema = SchemaFactory.createForClass(Setting);
