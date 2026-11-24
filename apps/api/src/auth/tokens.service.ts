import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, randomBytes } from 'node:crypto';
import { Model, Types } from 'mongoose';
import type { JwtConfig } from '../config/configuration';
import type { JwtPayload } from './types/authenticated-user';
import { durationToMs } from './duration';
import { RefreshToken, RefreshTokenDocument } from './schemas/refresh-token.schema';

export interface SessionMeta {
  userAgent?: string | null;
  ip?: string | null;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class TokensService {
  private readonly jwtConfig: JwtConfig;

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectModel(RefreshToken.name)
    private readonly refreshModel: Model<RefreshTokenDocument>,
  ) {
    this.jwtConfig = this.config.get<JwtConfig>('jwt')!;
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  signAccessToken(userId: string, email: string): string {
    const payload: JwtPayload = { sub: userId, email };
    return this.jwtService.sign(payload, {
      secret: this.jwtConfig.accessSecret,
      expiresIn: this.jwtConfig.accessTtl,
    } as JwtSignOptions);
  }

  /** Emite un refresh token nuevo (persistido como hash) y lo devuelve en claro. */
  async issueRefreshToken(userId: string, meta: SessionMeta = {}): Promise<string> {
    const raw = randomBytes(48).toString('hex');
    await this.refreshModel.create({
      user: new Types.ObjectId(userId),
      tokenHash: this.hash(raw),
      expiresAt: new Date(Date.now() + durationToMs(this.jwtConfig.refreshTtl)),
      userAgent: meta.userAgent ?? null,
      ip: meta.ip ?? null,
    });
    return raw;
  }

  async issueTokenPair(userId: string, email: string, meta?: SessionMeta): Promise<TokenPair> {
    return {
      accessToken: this.signAccessToken(userId, email),
      refreshToken: await this.issueRefreshToken(userId, meta),
    };
  }

  /** Valida un refresh token en claro y devuelve su documento activo. */
  private async findActive(raw: string): Promise<RefreshTokenDocument> {
    const doc = await this.refreshModel.findOne({ tokenHash: this.hash(raw) }).exec();
    if (!doc || doc.revokedAt || doc.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
    return doc;
  }

  /** Rota el refresh token: revoca el actual y emite uno nuevo. */
  async rotate(raw: string, meta?: SessionMeta): Promise<{ userId: string; refreshToken: string }> {
    const current = await this.findActive(raw);
    const userId = String(current.user);
    const newRaw = randomBytes(48).toString('hex');
    const replacement = await this.refreshModel.create({
      user: current.user,
      tokenHash: this.hash(newRaw),
      expiresAt: new Date(Date.now() + durationToMs(this.jwtConfig.refreshTtl)),
      userAgent: meta?.userAgent ?? current.userAgent,
      ip: meta?.ip ?? current.ip,
    });
    current.revokedAt = new Date();
    current.replacedBy = replacement._id as Types.ObjectId;
    await current.save();
    return { userId, refreshToken: newRaw };
  }

  async revoke(raw: string): Promise<void> {
    await this.refreshModel
      .updateOne({ tokenHash: this.hash(raw), revokedAt: null }, { revokedAt: new Date() })
      .exec();
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.refreshModel
      .updateMany({ user: new Types.ObjectId(userId), revokedAt: null }, { revokedAt: new Date() })
      .exec();
  }

  /** Revoca todas las sesiones del usuario salvo la del refresh token indicado. */
  async revokeOthers(userId: string, keepRaw: string): Promise<void> {
    await this.refreshModel
      .updateMany(
        { user: new Types.ObjectId(userId), revokedAt: null, tokenHash: { $ne: this.hash(keepRaw) } },
        { revokedAt: new Date() },
      )
      .exec();
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    if (!Types.ObjectId.isValid(sessionId)) return;
    await this.refreshModel
      .updateOne(
        { _id: sessionId, user: new Types.ObjectId(userId), revokedAt: null },
        { revokedAt: new Date() },
      )
      .exec();
  }

  /** Sesiones activas (refresh tokens no revocados ni expirados) de un usuario. */
  async listSessions(userId: string) {
    const docs = await this.refreshModel
      .find({ user: new Types.ObjectId(userId), revokedAt: null, expiresAt: { $gt: new Date() } })
      .select('_id userAgent ip createdAt expiresAt')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return docs.map((d) => ({
      id: String(d._id),
      userAgent: d.userAgent,
      ip: d.ip,
      createdAt: (d as unknown as { createdAt: Date }).createdAt,
      expiresAt: d.expiresAt,
    }));
  }
}
