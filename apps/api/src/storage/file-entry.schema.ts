import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../users/schemas/user.schema';

export type FileEntryDocument = HydratedDocument<FileEntry>;

export const MEDIA_KINDS = ['image', 'audio', 'video', 'other'] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

/** Registro de un archivo subido (para el administrador de archivos / biblioteca de medios). */
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

  /** Hash SHA-256 del contenido (para deduplicar subidas idénticas). */
  @Prop({ type: String, default: null, index: true })
  sha256!: string | null;

  /** Categoría derivada del mime: image | audio | video | other. */
  @Prop({ type: String, enum: MEDIA_KINDS, default: 'other', index: true })
  kind!: MediaKind;

  @Prop({ type: Types.ObjectId, ref: User.name, default: null })
  user!: Types.ObjectId | null;
}

export const FileEntrySchema = SchemaFactory.createForClass(FileEntry);
