import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, randomBytes } from 'node:crypto';
import { Model, Types } from 'mongoose';
import { ApiToken, ApiTokenDocument } from './schemas/api-token.schema';

const PREFIX = 'sm_';

@Injectable()
export class ApiTokensService {
  constructor(@InjectModel(ApiToken.name) private readonly model: Model<ApiTokenDocument>) {}

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /** Crea un token y devuelve el valor en claro UNA sola vez. */
  async create(userId: string, name: string): Promise<{ id: string; name: string; token: string; createdAt: Date }> {
    const raw = `${PREFIX}${randomBytes(32).toString('hex')}`;
    const doc = await this.model.create({
      user: new Types.ObjectId(userId),
      name: name.trim() || 'Token',
      tokenHash: this.hash(raw),
    });
    return { id: String(doc._id), name: doc.name, token: raw, createdAt: (doc as unknown as { createdAt: Date }).createdAt };
  }

  async list(userId: string) {
    const docs = await this.model
      .find({ user: new Types.ObjectId(userId) })
      .select('_id name lastUsedAt createdAt')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return docs.map((d) => ({
      id: String(d._id),
      name: d.name,
      lastUsedAt: d.lastUsedAt,
      createdAt: (d as unknown as { createdAt: Date }).createdAt,
    }));
  }

  async revoke(userId: string, id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Token no encontrado');
    const res = await this.model.deleteOne({ _id: id, user: new Types.ObjectId(userId) }).exec();
    if (res.deletedCount === 0) throw new NotFoundException('Token no encontrado');
  }

  /** Resuelve el id de usuario dueño de un token en claro válido (y marca uso). */
  async resolveUserId(raw: string): Promise<string | null> {
    if (!raw.startsWith(PREFIX)) return null;
    const doc = await this.model.findOne({ tokenHash: this.hash(raw) }).exec();
    if (!doc) return null;
    doc.lastUsedAt = new Date();
    await doc.save();
    return String(doc.user);
  }
}
