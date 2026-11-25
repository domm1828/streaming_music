import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type ApiTokenDocument = HydratedDocument<ApiToken>;

/** Token de acceso personal (para usar la API fuera del navegador). Se guarda sólo el hash. */
@Schema({ timestamps: true, collection: 'api_tokens' })
export class ApiToken {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  user!: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 80 })
  name!: string;

  @Prop({ required: true, unique: true, index: true })
  tokenHash!: string;

  @Prop({ type: Date, default: null })
  lastUsedAt!: Date | null;
}

export const ApiTokenSchema = SchemaFactory.createForClass(ApiToken);
