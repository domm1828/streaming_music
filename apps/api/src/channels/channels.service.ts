import { ConflictException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import slugify from 'slugify';
import { Artist, ArtistDocument } from '../catalog/schemas/artist.schema';
import { Album, AlbumDocument } from '../catalog/schemas/album.schema';
import { Track, TrackDocument } from '../catalog/schemas/track.schema';
import { Playlist, PlaylistDocument } from '../playlists/schemas/playlist.schema';
import { CreateChannelDto, UpdateChannelDto } from './dto/channel.dto';
import { Channel, ChannelDocument, ChannelSourceType } from './schemas/channel.schema';

/** Tipo de entidad que resuelve cada fuente. */
const SOURCE_ITEM_TYPE: Record<ChannelSourceType, 'track' | 'album' | 'artist' | 'playlist' | 'mixed'> = {
  topTracks: 'track',
  newAlbums: 'album',
  topArtists: 'artist',
  genreTracks: 'track',
  publicPlaylists: 'playlist',
  manual: 'mixed',
};

export interface ResolvedChannelView {
  _id: unknown;
  slug: string;
  name: string;
  type: string;
  layout: string;
  sourceType: string;
  itemType: string;
  items: unknown[];
}
type ResolvedChannelFeed = ResolvedChannelView[];

const DEFAULT_CHANNELS: CreateChannelDto[] = [
  { name: 'Tendencias', slug: 'trending', type: 'home', position: 0, config: { sourceType: 'topTracks', layout: 'trackTable', params: { limit: 10 } } },
  { name: 'Novedades', slug: 'new-releases', type: 'home', position: 1, config: { sourceType: 'newAlbums', layout: 'grid', params: { limit: 12 } } },
  { name: 'Artistas populares', slug: 'popular-artists', type: 'home', position: 2, config: { sourceType: 'topArtists', layout: 'grid', params: { limit: 12 } } },
  { name: 'Playlists destacadas', slug: 'featured-playlists', type: 'home', position: 3, config: { sourceType: 'publicPlaylists', layout: 'grid', params: { limit: 12 } } },
];

@Injectable()
export class ChannelsService implements OnModuleInit {
  private readonly logger = new Logger(ChannelsService.name);

  constructor(
    @InjectModel(Channel.name) private readonly model: Model<ChannelDocument>,
    @InjectModel(Track.name) private readonly trackModel: Model<TrackDocument>,
    @InjectModel(Album.name) private readonly albumModel: Model<AlbumDocument>,
    @InjectModel(Artist.name) private readonly artistModel: Model<ArtistDocument>,
    @InjectModel(Playlist.name) private readonly playlistModel: Model<PlaylistDocument>,
  ) {}

  /** Siembra channels por defecto la primera vez. */
  async onModuleInit(): Promise<void> {
    const count = await this.model.estimatedDocumentCount().exec();
    if (count > 0) return;
    for (const dto of DEFAULT_CHANNELS) {
      await this.create(dto).catch(() => undefined);
    }
    this.logger.log('Channels por defecto sembrados');
  }

  private async uniqueSlug(name: string, provided?: string): Promise<string> {
    const base = slugify(provided ?? name, { lower: true, strict: true }) || 'channel';
    let slug = base;
    let i = 1;
    while (await this.model.exists({ slug })) slug = `${base}-${++i}`;
    return slug;
  }

  async create(dto: CreateChannelDto): Promise<ChannelDocument> {
    const slug = await this.uniqueSlug(dto.name, dto.slug);
    try {
      return await this.model.create({
        slug,
        name: dto.name,
        type: dto.type ?? 'home',
        config: dto.config,
        content: (dto.content ?? []).map((c) => ({
          refType: c.refType,
          refId: new Types.ObjectId(c.refId),
          order: c.order ?? 0,
        })),
        position: dto.position ?? 0,
        public: dto.public ?? true,
        internal: dto.internal ?? false,
      });
    } catch (err) {
      if ((err as { code?: number }).code === 11000) throw new ConflictException('El slug ya existe');
      throw err;
    }
  }

  private async getOrFail(id: string): Promise<ChannelDocument> {
    const channel = Types.ObjectId.isValid(id) ? await this.model.findById(id).exec() : null;
    if (!channel) throw new NotFoundException('Channel no encontrado');
    return channel;
  }

  async update(id: string, dto: UpdateChannelDto): Promise<ChannelDocument> {
    const channel = await this.getOrFail(id);
    if (dto.name !== undefined) channel.name = dto.name;
    if (dto.type !== undefined) channel.type = dto.type;
    if (dto.config !== undefined) channel.config = { ...channel.config, ...dto.config };
    if (dto.position !== undefined) channel.position = dto.position;
    if (dto.public !== undefined) channel.public = dto.public;
    if (dto.internal !== undefined) channel.internal = dto.internal;
    if (dto.content !== undefined) {
      channel.content = dto.content.map((c) => ({
        refType: c.refType,
        refId: new Types.ObjectId(c.refId),
        order: c.order ?? 0,
      }));
    }
    await channel.save();
    this.invalidateFeed();
    return channel;
  }

  async remove(id: string): Promise<void> {
    const res = await this.model.deleteOne({ _id: id }).exec();
    if (res.deletedCount === 0) throw new NotFoundException('Channel no encontrado');
    this.invalidateFeed();
  }

  // Caché en memoria del feed resuelto (alto tráfico: se pega en cada carga de home).
  private readonly feedCache = new Map<string, { at: number; data: ResolvedChannelFeed }>();
  private static readonly FEED_TTL_MS = 30_000;

  /** Lista los channels públicos de una página, ordenados, con su contenido resuelto. */
  async listResolved(type?: string): Promise<ResolvedChannelFeed> {
    const key = type ?? '*';
    const cached = this.feedCache.get(key);
    if (cached && Date.now() - cached.at < ChannelsService.FEED_TTL_MS) return cached.data;

    const filter: Record<string, unknown> = { public: true, internal: false };
    if (type) filter.type = type;
    const channels = await this.model.find(filter).sort({ position: 1 }).lean().exec();
    const data = await Promise.all(channels.map((c) => this.attachItems(c as unknown as Channel)));
    this.feedCache.set(key, { at: Date.now(), data });
    return data;
  }

  /** Invalida el caché del feed (tras refrescar/editar channels). */
  private invalidateFeed(): void {
    this.feedCache.clear();
  }

  async getBySlugResolved(slug: string) {
    const channel = await this.model.findOne({ slug: slug.toLowerCase() }).lean().exec();
    if (!channel) throw new NotFoundException('Channel no encontrado');
    return this.attachItems(channel as unknown as Channel);
  }

  /** Lista todos los channels (admin). */
  async listAll() {
    return this.model.find().sort({ type: 1, position: 1 }).lean().exec();
  }

  private limitOf(channel: Channel): number {
    const l = Number((channel.config.params as { limit?: number })?.limit ?? 12);
    return Math.min(Math.max(l, 1), 50);
  }

  /** Resuelve el contenido real del channel según su fuente. */
  async resolveContent(channel: Channel): Promise<{ itemType: string; items: unknown[] }> {
    const limit = this.limitOf(channel);
    const source = channel.config.sourceType;
    const itemType = SOURCE_ITEM_TYPE[source];

    switch (source) {
      case 'topTracks':
        return { itemType, items: await this.trackModel.find().sort({ plays: -1 }).limit(limit).populate('artists.artist').populate('album').lean().exec() };
      case 'newAlbums':
        return { itemType, items: await this.albumModel.find().sort({ createdAt: -1 }).limit(limit).populate('artists').lean().exec() };
      case 'topArtists':
        return { itemType, items: await this.artistModel.find().sort({ followers: -1, views: -1 }).limit(limit).lean().exec() };
      case 'publicPlaylists':
        return { itemType, items: await this.playlistModel.find({ public: true }).sort({ followersCount: -1 }).limit(limit).lean().exec() };
      case 'genreTracks': {
        const genre = (channel.config.params as { genre?: string })?.genre;
        const filter = genre && Types.ObjectId.isValid(genre) ? { genres: new Types.ObjectId(genre) } : {};
        return { itemType, items: await this.trackModel.find(filter).sort({ plays: -1 }).limit(limit).populate('artists.artist').populate('album').lean().exec() };
      }
      case 'manual':
        return { itemType, items: await this.resolveManual(channel) };
    }
  }

  private async resolveManual(channel: Channel): Promise<unknown[]> {
    const ordered = [...channel.content].sort((a, b) => a.order - b.order);
    const loaders = {
      track: (ids: Types.ObjectId[]) => this.trackModel.find({ _id: { $in: ids } }).populate('artists.artist').populate('album').lean().exec(),
      album: (ids: Types.ObjectId[]) => this.albumModel.find({ _id: { $in: ids } }).populate('artists').lean().exec(),
      artist: (ids: Types.ObjectId[]) => this.artistModel.find({ _id: { $in: ids } }).lean().exec(),
      playlist: (ids: Types.ObjectId[]) => this.playlistModel.find({ _id: { $in: ids } }).lean().exec(),
    } as const;
    const byType = new Map<string, Types.ObjectId[]>();
    for (const item of ordered) {
      if (!byType.has(item.refType)) byType.set(item.refType, []);
      byType.get(item.refType)!.push(item.refId);
    }
    const loaded = new Map<string, unknown>();
    await Promise.all(
      [...byType.entries()].map(async ([type, ids]) => {
        const docs = await loaders[type as keyof typeof loaders](ids);
        for (const d of docs as Array<{ _id: unknown }>) loaded.set(`${type}:${String(d._id)}`, { ...d, _itemType: type });
      }),
    );
    return ordered.map((i) => loaded.get(`${i.refType}:${String(i.refId)}`)).filter(Boolean);
  }

  private async attachItems(channel: Channel & { _id?: unknown }): Promise<ResolvedChannelView> {
    const { itemType, items } = await this.resolveContent(channel);
    return {
      _id: (channel as { _id?: unknown })._id,
      slug: channel.slug,
      name: channel.name,
      type: channel.type,
      layout: channel.config.layout,
      sourceType: channel.config.sourceType,
      itemType,
      items,
    };
  }

  /**
   * Refresca el cache de contenido de los channels. Aísla los fallos por channel
   * para que una fuente rota no rompa el resto. Devuelve cuántos se refrescaron.
   */
  async refreshAll(): Promise<{ refreshed: number; failed: number }> {
    const channels = await this.model.find().exec();
    let refreshed = 0;
    let failed = 0;
    for (const channel of channels) {
      try {
        const { items } = await this.resolveContent(channel);
        const itemType = SOURCE_ITEM_TYPE[channel.config.sourceType];
        if (itemType !== 'mixed') {
          channel.content = (items as Array<{ _id: Types.ObjectId }>).map((it, i) => ({
            refType: itemType,
            refId: new Types.ObjectId(String(it._id)),
            order: i,
          }));
        }
        channel.lastRefreshedAt = new Date();
        await channel.save();
        refreshed += 1;
      } catch (e) {
        failed += 1;
        this.logger.warn(`Refresco falló para channel ${channel.slug}: ${(e as Error).message}`);
      }
    }
    this.invalidateFeed();
    this.logger.log(`Channels refrescados: ${refreshed} ok, ${failed} con error`);
    return { refreshed, failed };
  }
}
