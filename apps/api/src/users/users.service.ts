import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { buildPaginationMeta } from '@stream-music/shared';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { Role } from './schemas/role.schema';
import { User, UserDocument } from './schemas/user.schema';
import { RolesService } from './roles.service';

export interface CreateUserInput {
  name: string;
  username: string;
  email: string;
  passwordHash?: string | null;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly rolesService: RolesService,
  ) {}

  async create(input: CreateUserInput): Promise<UserDocument> {
    await this.assertUnique(input.email, input.username);
    const roles = await this.rolesService.getDefaultRoleIds();
    try {
      return await this.userModel.create({
        name: input.name,
        username: input.username,
        email: input.email,
        passwordHash: input.passwordHash ?? null,
        roles,
      });
    } catch (err) {
      if ((err as { code?: number }).code === 11000) {
        throw new ConflictException('El email o nombre de usuario ya está en uso');
      }
      throw err;
    }
  }

  findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).select('+passwordHash').exec();
  }

  findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  findById(id: string): Promise<UserDocument | null> {
    if (!Types.ObjectId.isValid(id)) return Promise.resolve(null);
    return this.userModel.findById(id).exec();
  }

  /** Carga un usuario con sus roles poblados y lo mapea a AuthenticatedUser. */
  async getAuthenticatedUser(id: string): Promise<AuthenticatedUser | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const user = await this.userModel
      .findById(id)
      .populate<{ roles: Role[] }>('roles')
      .exec();
    if (!user || user.bannedAt) return null;
    return this.toAuthenticatedUser(user);
  }

  toAuthenticatedUser(
    user: Pick<User, 'email' | 'name' | 'username' | 'emailVerifiedAt'> & {
      _id: unknown;
      roles: (Role | Types.ObjectId)[];
    },
  ): AuthenticatedUser {
    const roles = (user.roles as Role[]).filter((r) => r && typeof r === 'object' && 'name' in r);
    const permissions = Array.from(new Set(roles.flatMap((r) => r.permissions)));
    return {
      id: String(user._id),
      email: user.email,
      name: user.name,
      username: user.username,
      roles: roles.map((r) => r.name),
      permissions,
      emailVerified: Boolean(user.emailVerifiedAt),
    };
  }

  async setPassword(userId: string, passwordHash: string): Promise<void> {
    await this.userModel.updateOne({ _id: userId }, { passwordHash }).exec();
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.userModel.updateOne({ _id: userId }, { emailVerifiedAt: new Date() }).exec();
  }

  async list(page: number, perPage: number, search?: string) {
    const filter = search
      ? {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { username: { $regex: search, $options: 'i' } },
          ],
        }
      : {};
    const [data, total] = await Promise.all([
      this.userModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .populate<{ roles: Role[] }>('roles')
        .lean()
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);
    return { data, pagination: buildPaginationMeta(total, page, perPage) };
  }

  async update(id: string, changes: Partial<Pick<User, 'name' | 'language' | 'image' | 'type'>>) {
    const user = await this.userModel
      .findByIdAndUpdate(id, changes, { new: true })
      .populate<{ roles: Role[] }>('roles')
      .exec();
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async remove(id: string): Promise<void> {
    const res = await this.userModel.deleteOne({ _id: id }).exec();
    if (res.deletedCount === 0) throw new NotFoundException('Usuario no encontrado');
  }

  async setRoles(id: string, roleIds: string[]) {
    const user = await this.userModel
      .findByIdAndUpdate(id, { roles: roleIds.map((r) => new Types.ObjectId(r)) }, { new: true })
      .populate<{ roles: Role[] }>('roles')
      .exec();
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  // --- 2FA ---
  async setTwoFactorSecret(userId: string, secret: string): Promise<void> {
    await this.userModel
      .updateOne({ _id: userId }, { $set: { 'twoFactor.secret': secret, 'twoFactor.confirmedAt': null } })
      .exec();
  }

  async confirmTwoFactor(userId: string, recoveryHashes: string[]): Promise<void> {
    await this.userModel
      .updateOne(
        { _id: userId },
        { $set: { 'twoFactor.confirmedAt': new Date(), 'twoFactor.recoveryCodes': recoveryHashes } },
      )
      .exec();
  }

  async disableTwoFactor(userId: string): Promise<void> {
    await this.userModel
      .updateOne(
        { _id: userId },
        { $set: { 'twoFactor.secret': null, 'twoFactor.recoveryCodes': [], 'twoFactor.confirmedAt': null } },
      )
      .exec();
  }

  async setRecoveryCodes(userId: string, hashes: string[]): Promise<void> {
    await this.userModel.updateOne({ _id: userId }, { $set: { 'twoFactor.recoveryCodes': hashes } }).exec();
  }

  async setBanned(id: string, banned: boolean) {
    const user = await this.userModel
      .findByIdAndUpdate(id, { bannedAt: banned ? new Date() : null }, { new: true })
      .exec();
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  private async assertUnique(email: string, username: string): Promise<void> {
    const existing = await this.userModel
      .findOne({ $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] })
      .select('_id')
      .lean()
      .exec();
    if (existing) throw new ConflictException('El email o nombre de usuario ya está en uso');
  }
}
