import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../users/schemas/user.schema';

export type FileEntryDocument = HydratedDocument<FileEntry>;

/** Registro de un archivo subido (para el administrador de archivos). */
@Schema({ timestamps: true, collection: 'file_entries' })
export class FileEntry {
  /** URL pública (para usar en <img>). */
  @Prop({ required: true })
  url!: string;

  /** publicPath interno (para borrar vía StorageService). */
  @Prop({ required: true })
  path!: string;

  @Prop({ required: true })
  filename!: string;

  @Prop({ type: String, default: null })
  mime!: string | null;

  @Prop({ type: Number, default: 0 })
  size!: number;

  @Prop({ type: Types.ObjectId, ref: User.name, default: null })
  user!: Types.ObjectId | null;
}

export const FileEntrySchema = SchemaFactory.createForClass(FileEntry);
