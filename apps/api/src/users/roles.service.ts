import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DEFAULT_ROLES, PERMISSION_CATALOG } from '../auth/rbac/permissions';
import { Role, RoleDocument } from './schemas/role.schema';
import { User, UserDocument } from './schemas/user.schema';

/** Roles sembrados que no se pueden eliminar. */
const PROTECTED_ROLES = ['admin', 'user'];

@Injectable()
export class RolesService implements OnModuleInit {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    @InjectModel(Role.name) private readonly roleModel: Model<RoleDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

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

  /** Catálogo de permisos asignables (para el editor de roles). */
  listPermissions() {
    return PERMISSION_CATALOG;
  }

  /** Roles con la cantidad de usuarios que los tienen, y si son del sistema. */
  async findAllWithCounts() {
    const roles = await this.roleModel.find().sort({ name: 1 }).lean().exec();
    const counts = await this.userModel
      .aggregate<{ _id: Types.ObjectId; count: number }>([
        { $unwind: '$roles' },
        { $group: { _id: '$roles', count: { $sum: 1 } } },
      ])
      .exec();
    const map = new Map(counts.map((c) => [String(c._id), c.count]));
    return roles.map((r) => ({
      ...r,
      userCount: map.get(String(r._id)) ?? 0,
      system: PROTECTED_ROLES.includes(r.name),
    }));
  }

  private validatePermissions(perms?: string[]): void {
    if (!perms) return;
    const valid = new Set<string>(PERMISSION_CATALOG.map((p) => p.value));
    const bad = perms.filter((p) => !valid.has(p));
    if (bad.length) throw new BadRequestException(`Permisos inválidos: ${bad.join(', ')}`);
  }

  private async findByIdOrFail(id: string): Promise<RoleDocument> {
    const role = Types.ObjectId.isValid(id) ? await this.roleModel.findById(id).exec() : null;
    if (!role) throw new NotFoundException('Rol no encontrado');
    return role;
  }

  async create(dto: { name: string; description?: string; permissions?: string[]; default?: boolean }): Promise<RoleDocument> {
    this.validatePermissions(dto.permissions);
    if (await this.roleModel.exists({ name: dto.name })) {
      throw new ConflictException('Ya existe un rol con ese nombre');
    }
    return this.roleModel.create({
      name: dto.name,
      description: dto.description ?? '',
      permissions: dto.permissions ?? [],
      default: dto.default ?? false,
    });
  }

  async update(
    id: string,
    dto: { name?: string; description?: string; permissions?: string[]; default?: boolean },
  ): Promise<RoleDocument> {
    const role = await this.findByIdOrFail(id);
    const isSystem = PROTECTED_ROLES.includes(role.name);
    this.validatePermissions(dto.permissions);
    // Los roles del sistema no cambian de nombre ni de permisos (evita bloqueos de acceso).
    if (dto.name !== undefined && !isSystem) role.name = dto.name;
    if (dto.permissions !== undefined && !isSystem) role.permissions = dto.permissions;
    if (dto.description !== undefined) role.description = dto.description;
    if (dto.default !== undefined) role.default = dto.default;
    await role.save();
    return role;
  }

  async remove(id: string): Promise<void> {
    const role = await this.findByIdOrFail(id);
    if (PROTECTED_ROLES.includes(role.name)) {
      throw new BadRequestException('No se puede eliminar un rol del sistema');
    }
    await this.userModel.updateMany({ roles: role._id }, { $pull: { roles: role._id } }).exec();
    await role.deleteOne();
  }

  /** Ids de los roles marcados como `default` (para usuarios nuevos). */
  async getDefaultRoleIds(): Promise<Types.ObjectId[]> {
    const roles = await this.roleModel.find({ default: true }).select('_id').lean().exec();
    return roles.map((r) => r._id as Types.ObjectId);
  }
}
