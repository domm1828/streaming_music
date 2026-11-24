import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { AppConfig } from '../config/configuration';
import { Artist, ArtistDocument } from '../catalog/schemas/artist.schema';
import { Album, AlbumDocument } from '../catalog/schemas/album.schema';
import { Track, TrackDocument } from '../catalog/schemas/track.schema';
import { Playlist, PlaylistDocument } from '../playlists/schemas/playlist.schema';
import { CustomPage, CustomPageDocument } from './schemas/custom-page.schema';

function xmlEscape(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);
}

@Injectable()
export class SitemapService {
  private readonly base: string;

  constructor(
    config: ConfigService,
    @InjectModel(Artist.name) private readonly artistModel: Model<ArtistDocument>,
    @InjectModel(Album.name) private readonly albumModel: Model<AlbumDocument>,
    @InjectModel(Track.name) private readonly trackModel: Model<TrackDocument>,
    @InjectModel(Playlist.name) private readonly playlistModel: Model<PlaylistDocument>,
    @InjectModel(CustomPage.name) private readonly pageModel: Model<CustomPageDocument>,
  ) {
    this.base = (config.get<AppConfig>('app')?.appUrl ?? 'http://localhost:5173').replace(/\/$/, '');
  }

  /** Genera el sitemap.xml con el contenido público actual del catálogo. */
  async generate(): Promise<string> {
    const urls: string[] = [`${this.base}/`, `${this.base}/browse`, `${this.base}/search`];

    const [artists, albums, tracks, playlists, pages] = await Promise.all([
      this.artistModel.find().select('_id').limit(5000).lean().exec(),
      this.albumModel.find().select('_id').limit(5000).lean().exec(),
      this.trackModel.find().select('_id').limit(5000).lean().exec(),
      this.playlistModel.find({ public: true }).select('_id').limit(5000).lean().exec(),
      this.pageModel.find({ published: true }).select('slug').lean().exec(),
    ]);

    const push = (prefix: string, docs: Array<{ _id: unknown }>) => {
      for (const d of docs) urls.push(`${this.base}${prefix}/${String(d._id)}`);
    };
    push('/artist', artists);
    push('/album', albums);
    push('/track', tracks);
    push('/playlist', playlists);
    for (const p of pages) urls.push(`${this.base}/page/${p.slug}`);

    const body = urls.map((u) => `  <url><loc>${xmlEscape(u)}</loc></url>`).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;
  }

  /** Metadatos SEO de una entidad pública (title, description, imagen, url canónica). */
  async meta(type: string, id: string) {
    if (!Types.ObjectId.isValid(id)) return this.defaultMeta();
    const _id = new Types.ObjectId(id);
    switch (type) {
      case 'artist': {
        const a = await this.artistModel.findById(_id).lean().exec();
        return a
          ? { title: `${a.name} — Stream Music`, description: a.bio ?? `Escuchá a ${a.name} en Stream Music.`, image: a.image, url: `${this.base}/artist/${id}` }
          : this.defaultMeta();
      }
      case 'album': {
        const a = await this.albumModel.findById(_id).populate('artists', 'name').lean().exec();
        return a
          ? { title: `${a.name} — Stream Music`, description: a.description ?? `Álbum ${a.name} en Stream Music.`, image: a.image, url: `${this.base}/album/${id}` }
          : this.defaultMeta();
      }
      case 'track': {
        const t = await this.trackModel.findById(_id).lean().exec();
        return t
          ? { title: `${t.name} — Stream Music`, description: `Escuchá ${t.name} en Stream Music.`, image: t.image, url: `${this.base}/track/${id}` }
          : this.defaultMeta();
      }
      default:
        return this.defaultMeta();
    }
  }

  private defaultMeta() {
    return {
      title: 'Stream Music',
      description: 'Descubrí artistas, armá tu biblioteca y escuchá lo que quieras en Stream Music.',
      image: null,
      url: `${this.base}/`,
    };
  }
}
