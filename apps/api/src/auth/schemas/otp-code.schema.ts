import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type OtpPurpose = 'email-verify' | 'password-reset';
export type OtpCodeDocument = HydratedDocument<OtpCode>;

/** Código de un solo uso (OTP) para verificación de email y reseteo de contraseña. */
@Schema({ timestamps: true, collection: 'otp_codes' })
export class OtpCode {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  user!: Types.ObjectId;

  @Prop({ required: true })
  codeHash!: string;

  @Prop({ type: String, required: true, enum: ['email-verify', 'password-reset'] })
  purpose!: OtpPurpose;

  @Prop({ required: true })
  expiresAt!: Date;

  @Prop({ type: Date, default: null })
  consumedAt!: Date | null;
}

export const OtpCodeSchema = SchemaFactory.createForClass(OtpCode);
