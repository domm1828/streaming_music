import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Role } from './role.schema';

export type UserDocument = HydratedDocument<User>;

@Schema({ _id: false })
export class TwoFactor {
  @Prop({ type: String, default: null })
  secret!: string | null;

  @Prop({ type: [String], default: [] })
  recoveryCodes!: string[];

  @Prop({ type: Date, default: null })
  confirmedAt!: Date | null;
}
const TwoFactorSchema = SchemaFactory.createForClass(TwoFactor);

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  username!: string;

  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  email!: string;

  /** Null para cuentas de login social (Phase 8). Nunca se expone. */
  @Prop({ type: String, default: null, select: false })
  passwordHash!: string | null;

  @Prop({ type: String, default: null })
  image!: string | null;

  @Prop({ type: String, default: null })
  gender!: string | null;

  @Prop({ default: 'es' })
  language!: string;

  @Prop({ default: 'user' })
  type!: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: Role.name }], default: [] })
  roles!: Types.ObjectId[];

  @Prop({ type: Date, default: null })
  emailVerifiedAt!: Date | null;

  @Prop({ type: Date, default: null })
  bannedAt!: Date | null;

  @Prop({ type: String, default: null })
  stripeId!: string | null;

  @Prop({ type: String, default: null })
  paypalId!: string | null;

  @Prop({ type: TwoFactorSchema, default: () => ({}) })
  twoFactor!: TwoFactor;
}

export const UserSchema = SchemaFactory.createForClass(User);
