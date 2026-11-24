import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type SocialProfileDocument = HydratedDocument<SocialProfile>;
export type SocialProvider = 'google' | 'facebook' | 'twitter';

/** Vínculo entre una cuenta local y un proveedor de login social. */
@Schema({ timestamps: true, collection: 'social_profiles' })
export class SocialProfile {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  user!: Types.ObjectId;

  @Prop({ type: String, required: true, enum: ['google', 'facebook', 'twitter'] })
  provider!: SocialProvider;

  @Prop({ required: true })
  providerId!: string;
}

export const SocialProfileSchema = SchemaFactory.createForClass(SocialProfile);
SocialProfileSchema.index({ provider: 1, providerId: 1 }, { unique: true });
