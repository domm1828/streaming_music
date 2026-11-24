import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { Artist } from '../../catalog/schemas/artist.schema';
import { User } from '../../users/schemas/user.schema';

export type BackstageRequestDocument = HydratedDocument<BackstageRequest>;
export type BackstageType = 'claim' | 'new';
export type BackstageStatus = 'pending' | 'approved' | 'rejected';

@Schema({ _id: false })
export class BackstageAttachment {
  @Prop({ required: true })
  filename!: string;

  /** Ruta de almacenamiento (privada: solo visible para el dueño y admins). */
  @Prop({ required: true })
  path!: string;

  @Prop({ type: String, default: null })
  mime!: string | null;
}
const BackstageAttachmentSchema = SchemaFactory.createForClass(BackstageAttachment);

/** Solicitud de reclamo/alta de artista (backstage) con workflow de aprobación. */
@Schema({ timestamps: true, collection: 'backstage_requests' })
export class BackstageRequest {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  user!: Types.ObjectId;

  @Prop({ type: String, required: true, enum: ['claim', 'new'] })
  type!: BackstageType;

  @Prop({ required: true, trim: true })
  artistName!: string;

  /** Artista a reclamar (si type = 'claim'). */
  @Prop({ type: Types.ObjectId, ref: Artist.name, default: null })
  artist!: Types.ObjectId | null;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  data!: Record<string, unknown>;

  @Prop({ type: [BackstageAttachmentSchema], default: [] })
  attachments!: BackstageAttachment[];

  @Prop({ type: String, required: true, enum: ['pending', 'approved', 'rejected'], default: 'pending' })
  status!: BackstageStatus;

  @Prop({ type: Types.ObjectId, ref: User.name, default: null })
  reviewedBy!: Types.ObjectId | null;

  @Prop({ type: String, default: null })
  reviewNote!: string | null;

  createdAt?: Date;
}

export const BackstageRequestSchema = SchemaFactory.createForClass(BackstageRequest);
BackstageRequestSchema.index({ status: 1, createdAt: -1 });
