import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { buildPaginationMeta } from '@stream-music/shared';
import { MailService } from '../mail/mail.service';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Notification, NotificationDocument } from './schemas/notification.schema';
import { NotificationsGateway } from './notifications.gateway';

export interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  data?: unknown;
  email?: boolean;
}

export type BroadcastAudience =
  | { kind: 'all' }
  | { kind: 'verified' }
  | { kind: 'role'; roleId: string }
  | { kind: 'users'; userIds: string[] };

export interface BroadcastInput {
  title: string;
  body?: string | null;
  link?: string | null;
  email?: boolean;
  audience: BroadcastAudience;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name) private readonly model: Model<NotificationDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly gateway: NotificationsGateway,
    private readonly mail: MailService,
  ) {}

  /** Crea la notificación, la entrega en tiempo real y (opcional) por email. */
  async create(input: CreateNotificationInput): Promise<NotificationDocument> {
    const notification = await this.model.create({
      user: new Types.ObjectId(input.userId),
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      data: input.data ?? null,
    });

    this.gateway.emitToUser(input.userId, 'notification', this.toDto(notification));

    if (input.email) {
      try {
        const user = await this.userModel.findById(input.userId).select('email emailNotifications').lean().exec();
        if (user?.email && user.emailNotifications !== false) {
          await this.mail.sendNotification(user.email, input.title, input.body ?? input.title);
          notification.emailSent = true;
          await notification.save();
        }
      } catch (e) {
        this.logger.warn(`No se pudo enviar email de notificación: ${(e as Error).message}`);
      }
    }
    return notification;
  }

  /** Resuelve la audiencia a una lista de ids de usuarios activos (no baneados). */
  private async resolveAudience(audience: BroadcastAudience): Promise<string[]> {
    const base: Record<string, unknown> = { bannedAt: null };
    if (audience.kind === 'verified') base.emailVerifiedAt = { $ne: null };
    else if (audience.kind === 'role') {
      if (!Types.ObjectId.isValid(audience.roleId)) return [];
      base.roles = new Types.ObjectId(audience.roleId);
    } else if (audience.kind === 'users') {
      const ids = audience.userIds.filter((id) => Types.ObjectId.isValid(id));
      if (ids.length === 0) return [];
      base._id = { $in: ids.map((id) => new Types.ObjectId(id)) };
    }
    const users = await this.userModel.find(base).select('_id').lean().exec();
    return users.map((u) => String(u._id));
  }

  /** Cuenta cuántos usuarios recibirían un broadcast con la audiencia dada. */
  async countAudience(audience: BroadcastAudience): Promise<number> {
    return (await this.resolveAudience(audience)).length;
  }

  /** Crea una notificación para cada usuario de la audiencia (tiempo real + email opcional). */
  async broadcast(input: BroadcastInput): Promise<{ sent: number }> {
    const userIds = await this.resolveAudience(input.audience);
    const data = input.link ? { link: input.link } : null;
    for (const userId of userIds) {
      await this.create({
        userId,
        type: 'admin.broadcast',
        title: input.title,
        body: input.body ?? null,
        data,
        email: input.email,
      });
    }
    return { sent: userIds.length };
  }

  async list(userId: string, page: number, perPage: number) {
    const filter = { user: new Types.ObjectId(userId) };
    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip((page - 1) * perPage).limit(perPage).lean().exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { data, pagination: buildPaginationMeta(total, page, perPage) };
  }

  async unreadCount(userId: string): Promise<number> {
    return this.model.countDocuments({ user: new Types.ObjectId(userId), readAt: null }).exec();
  }

  async getPreferences(userId: string): Promise<{ emailNotifications: boolean }> {
    const user = await this.userModel.findById(userId).select('emailNotifications').lean().exec();
    return { emailNotifications: user?.emailNotifications ?? true };
  }

  async setPreferences(userId: string, emailNotifications: boolean): Promise<{ emailNotifications: boolean }> {
    await this.userModel.updateOne({ _id: userId }, { $set: { emailNotifications } }).exec();
    return { emailNotifications };
  }

  async markRead(id: string, userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Notificación no encontrada');
    const res = await this.model.updateOne(
      { _id: id, user: new Types.ObjectId(userId) },
      { $set: { readAt: new Date() } },
    );
    if (res.matchedCount === 0) throw new NotFoundException('Notificación no encontrada');
  }

  async markAllRead(userId: string): Promise<number> {
    const res = await this.model.updateMany(
      { user: new Types.ObjectId(userId), readAt: null },
      { $set: { readAt: new Date() } },
    );
    return res.modifiedCount;
  }

  private toDto(n: NotificationDocument) {
    return {
      _id: String(n._id),
      type: n.type,
      title: n.title,
      body: n.body,
      data: n.data,
      readAt: n.readAt,
      createdAt: n.createdAt,
    };
  }
}
