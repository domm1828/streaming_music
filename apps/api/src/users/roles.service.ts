import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DEFAULT_ROLES } from '../auth/rbac/permissions';
import { Role, RoleDocument } from './schemas/role.schema';

@Injectable()
export class RolesService implements OnModuleInit {
  private readonly logger = new Logger(RolesService.name);

  constructor(@InjectModel(Role.name) private readonly roleModel: Model<RoleDocument>) {}

  /** Siembra los roles por defecto (admin, user) si no existen. */
  async onModuleInit(): Promise<void> {
    for (const role of DEFAULT_ROLES) {
      await this.roleModel.updateOne(
        { name: role.name },
        { $setOnInsert: role },
        { upsert: true },
      );
    }
    this.logger.log('Roles por defecto verificados');
  }

  findAll(): Promise<RoleDocument[]> {
    return this.roleModel.find().lean<RoleDocument[]>().exec();
  }

  /** Ids de los roles marcados como `default` (para usuarios nuevos). */
  async getDefaultRoleIds(): Promise<Types.ObjectId[]> {
    const roles = await this.roleModel.find({ default: true }).select('_id').lean().exec();
    return roles.map((r) => r._id as Types.ObjectId);
  }
}
