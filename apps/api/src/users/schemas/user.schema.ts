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

/** Enlace social/web del perfil público. */
@Schema({ _id: false })
export class ProfileLink {
  @Prop({ required: true, trim: true })
  label!: string;

  @Prop({ required: true, trim: true })
  url!: string;
}
const ProfileLinkSchema = SchemaFactory.createForClass(ProfileLink);

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

  /** Preferencia: recibir notificaciones por email. */
  @Prop({ default: true })
  emailNotifications!: boolean;

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

  // --- Perfil público ---
  @Prop({ type: String, default: null })
  bio!: string | null;

  @Prop({ type: String, default: null })
  coverImage!: string | null;

  @Prop({ type: String, default: null })
  country!: string | null;

  @Prop({ type: [ProfileLinkSchema], default: [] })
  links!: ProfileLink[];

  /** Contadores desnormalizados que se mantienen al seguir/dejar de seguir. */
  @Prop({ default: 0 })
  followersCount!: number;

  @Prop({ default: 0 })
  followingCount!: number;

  /** Perfiles de artista reclamados/aprobados para esta cuenta (backstage). */
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Artist' }], default: [] })
  artistIds!: Types.ObjectId[];
}

export const UserSchema = SchemaFactory.createForClass(User);
