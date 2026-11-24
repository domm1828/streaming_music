import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { buildPaginationMeta } from '@stream-music/shared';
import { PERMISSIONS } from '../auth/rbac/permissions';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { SettingsService } from '../settings/settings.service';
import { Comment, CommentDocument, CommentableType } from './schemas/comment.schema';
import { Vote, VoteDocument } from './schemas/vote.schema';

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment.name) private readonly model: Model<CommentDocument>,
    @InjectModel(Vote.name) private readonly voteModel: Model<VoteDocument>,
    private readonly settings: SettingsService,
  ) {}

  private canModerate(user: AuthenticatedUser): boolean {
    return user.permissions.includes('*') || user.permissions.includes(PERMISSIONS.CONTENT_MANAGE);
  }

  async create(
    userId: string,
    type: CommentableType,
    id: string,
    content: string,
    parentId?: string,
  ): Promise<CommentDocument> {
    if (!(await this.settings.getBoolean('commentsEnabled', true))) {
      throw new ForbiddenException('Los comentarios están deshabilitados');
    }
    let path = '';
    if (parentId) {
      const parent = await this.model.findById(parentId).lean().exec();
      if (!parent) throw new NotFoundException('Comentario padre no encontrado');
      path = parent.path ? `${parent.path}/${String(parent._id)}` : String(parent._id);
    }
    return this.model.create({
      user: new Types.ObjectId(userId),
      commentableType: type,
      commentable: new Types.ObjectId(id),
      content,
      parent: parentId ? new Types.ObjectId(parentId) : null,
      path,
    });
  }

  /** Comentarios visibles de un contenido, ordenados por hilo. */
  async listForContent(type: CommentableType, id: string, page: number, perPage: number) {
    const filter = { commentableType: type, commentable: new Types.ObjectId(id), hiddenAt: null };
    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ path: 1, createdAt: 1 })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .populate({ path: 'user', select: 'name username image' })
        .lean()
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { data, pagination: buildPaginationMeta(total, page, perPage) };
  }

  async vote(commentId: string, userId: string, value: number): Promise<{ votes: number }> {
    if (!Types.ObjectId.isValid(commentId)) throw new NotFoundException('Comentario no encontrado');
    const exists = await this.model.exists({ _id: commentId });
    if (!exists) throw new NotFoundException('Comentario no encontrado');

    await this.voteModel.updateOne(
      { user: new Types.ObjectId(userId), comment: new Types.ObjectId(commentId) },
      { $set: { value } },
      { upsert: true },
    );
    const agg = await this.voteModel.aggregate<{ total: number }>([
      { $match: { comment: new Types.ObjectId(commentId) } },
      { $group: { _id: null, total: { $sum: '$value' } } },
    ]);
    const votes = agg[0]?.total ?? 0;
    await this.model.updateOne({ _id: commentId }, { $set: { votes } });
    return { votes };
  }

  /** Borra un comentario (dueño o moderador) y sus respuestas. */
  async remove(commentId: string, user: AuthenticatedUser): Promise<void> {
    const comment = await this.model.findById(commentId).exec();
    if (!comment) throw new NotFoundException('Comentario no encontrado');
    if (String(comment.user) !== user.id && !this.canModerate(user)) {
      throw new ForbiddenException('No podés borrar este comentario');
    }
    const descendantPrefix = comment.path ? `${comment.path}/${String(comment._id)}` : String(comment._id);
    await this.model.deleteMany({
      $or: [{ _id: comment._id }, { path: { $regex: `^${descendantPrefix}` } }],
    });
  }

  /** Oculta un comentario (moderación). */
  async hide(commentId: string): Promise<void> {
    const res = await this.model.updateOne({ _id: commentId }, { $set: { hiddenAt: new Date() } });
    if (res.matchedCount === 0) throw new NotFoundException('Comentario no encontrado');
  }
}
