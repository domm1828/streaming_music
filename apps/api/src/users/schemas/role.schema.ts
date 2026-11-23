import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RoleDocument = HydratedDocument<Role>;

@Schema({ timestamps: true, collection: 'roles' })
export class Role {
  @Prop({ required: true, unique: true, trim: true })
  name!: string;

  @Prop({ default: '' })
  description!: string;

  /** Rol asignado automáticamente a los usuarios nuevos. */
  @Prop({ default: false })
  default!: boolean;

  /** Permisos del rol. El comodín '*' concede todos los permisos. */
  @Prop({ type: [String], default: [] })
  permissions!: string[];
}

export const RoleSchema = SchemaFactory.createForClass(Role);
