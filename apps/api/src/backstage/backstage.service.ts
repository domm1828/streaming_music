import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import slugify from 'slugify';
import { buildPaginationMeta } from '@stream-music/shared';
import { Artist, ArtistDocument } from '../catalog/schemas/artist.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { StorageService } from '../storage/storage.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  BackstageRequest,
  BackstageRequestDocument,
  BackstageStatus,
  BackstageType,
} from './schemas/backstage-request.schema';

export interface SubmitBackstageInput {
  type: BackstageType;
  artistName: string;
  artistId?: string;
  message?: string;
}

export interface UploadedAttachment {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

@Injectable()
export class BackstageService {
  constructor(
    @InjectModel(BackstageRequest.name) private readonly model: Model<BackstageRequestDocument>,
    @InjectModel(Artist.name) private readonly artistModel: Model<ArtistDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly storage: StorageService,
    private readonly notifications: NotificationsService,
  ) {}

  async submit(userId: string, input: SubmitBackstageInput, files: UploadedAttachment[]) {
    if (input.type === 'claim' && !input.artistId) {
      throw new BadRequestException('Para reclamar un artista hay que indicar su id');
    }
    const attachments = [];
    for (const file of files) {
      const safe = slugify(file.originalname, { lower: true, strict: true, remove: /[^\w.-]/g }) || 'adjunto';
      const stored = await this.storage.saveBuffer(file.buffer, `backstage/${userId}`, `${Date.now()}-${safe}`);
      attachments.push({ filename: file.originalname, path: stored.publicPath, mime: file.mimetype });
    }
    return this.model.create({
      user: new Types.ObjectId(userId),
      type: input.type,
      artistName: input.artistName,
      artist: input.artistId ? new Types.ObjectId(input.artistId) : null,
      data: input.message ? { message: input.message } : {},
      attachments,
    });
  }

  /** Solicitudes del propio usuario (ve sus adjuntos). */
  async listMine(userId: string, page: number, perPage: number) {
    const filter = { user: new Types.ObjectId(userId) };
    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip((page - 1) * perPage).limit(perPage).lean().exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { data, pagination: buildPaginationMeta(total, page, perPage) };
  }

  /** Todas las solicitudes (admin): ve datos y adjuntos. */
  async listAll(status: BackstageStatus | undefined, page: number, perPage: number) {
    const filter = status ? { status } : {};
    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .populate({ path: 'user', select: 'name username email' })
        .lean()
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { data, pagination: buildPaginationMeta(total, page, perPage) };
  }

  private async getOrFail(id: string): Promise<BackstageRequestDocument> {
    const req = Types.ObjectId.isValid(id) ? await this.model.findById(id).exec() : null;
    if (!req) throw new NotFoundException('Solicitud no encontrada');
    return req;
  }

  /** Aprueba la solicitud: vincula (o crea) el artista con la cuenta del solicitante. */
  async approve(id: string, reviewerId: string, note?: string) {
    const req = await this.getOrFail(id);
    if (req.status !== 'pending') throw new BadRequestException('La solicitud ya fue resuelta');

    let artistId = req.artist;
    if (req.type === 'new' || !artistId) {
      const slug = await this.uniqueArtistSlug(req.artistName);
      const artist = await this.artistModel.create({ name: req.artistName, slug, verified: true });
      artistId = artist._id as Types.ObjectId;
    } else {
      await this.artistModel.updateOne({ _id: artistId }, { $set: { verified: true } });
    }

    await this.userModel.updateOne({ _id: req.user }, { $addToSet: { artistIds: artistId } });

    req.status = 'approved';
    req.artist = artistId;
    req.reviewedBy = new Types.ObjectId(reviewerId);
    req.reviewNote = note ?? null;
    await req.save();

    await this.notifications.create({
      userId: String(req.user),
      type: 'backstage.approved',
      title: 'Tu solicitud fue aprobada',
      body: `Ya podés gestionar el perfil de ${req.artistName}.`,
      data: { artistId: String(artistId) },
    });
    return req;
  }

  async reject(id: string, reviewerId: string, note?: string) {
    const req = await this.getOrFail(id);
    if (req.status !== 'pending') throw new BadRequestException('La solicitud ya fue resuelta');
    req.status = 'rejected';
    req.reviewedBy = new Types.ObjectId(reviewerId);
    req.reviewNote = note ?? null;
    await req.save();

    await this.notifications.create({
      userId: String(req.user),
      type: 'backstage.rejected',
      title: 'Tu solicitud fue rechazada',
      body: note ?? 'Revisá los datos e intentá nuevamente.',
    });
    return req;
  }

  /** Control de acceso a un adjunto: solo el dueño o un admin. */
  async getAttachmentPath(requestId: string, index: number, user: { id: string; isAdmin: boolean }) {
    const req = await this.getOrFail(requestId);
    if (String(req.user) !== user.id && !user.isAdmin) {
      throw new ForbiddenException('No podés acceder a este adjunto');
    }
    const att = req.attachments[index];
    if (!att) throw new NotFoundException('Adjunto no encontrado');
    return this.storage.rootDir + att.path.replace(/^\/uploads/, '');
  }

  private async uniqueArtistSlug(name: string): Promise<string> {
    const base = slugify(name, { lower: true, strict: true }) || 'artist';
    let slug = base;
    let i = 1;
    while (await this.artistModel.exists({ slug })) slug = `${base}-${++i}`;
    return slug;
  }
}
