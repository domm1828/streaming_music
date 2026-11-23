import { ConflictException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import slugify from 'slugify';
import { CustomPage, CustomPageDocument } from './schemas/custom-page.schema';

const DEFAULT_PAGES = [
  { slug: 'terms', title: 'Términos y condiciones', body: '<p>Términos de uso de Stream Music.</p>' },
  { slug: 'contact', title: 'Contacto', body: '<p>Escribinos a soporte para cualquier consulta.</p>' },
  { slug: 'help', title: 'Ayuda', body: '<p>Centro de ayuda de Stream Music.</p>' },
];

@Injectable()
export class CustomPagesService implements OnModuleInit {
  constructor(@InjectModel(CustomPage.name) private readonly model: Model<CustomPageDocument>) {}

  async onModuleInit(): Promise<void> {
    for (const p of DEFAULT_PAGES) {
      const exists = await this.model.exists({ slug: p.slug });
      if (!exists) await this.model.create(p);
    }
  }

  async getBySlug(slug: string) {
    const page = await this.model.findOne({ slug: slug.toLowerCase(), published: true }).lean().exec();
    if (!page) throw new NotFoundException('Página no encontrada');
    return page;
  }

  listPublic() {
    return this.model.find({ published: true }).select('slug title updatedAt').lean().exec();
  }

  listAll() {
    return this.model.find().sort({ slug: 1 }).lean().exec();
  }

  async create(input: { slug?: string; title: string; body: string; published?: boolean }) {
    const slug = slugify(input.slug ?? input.title, { lower: true, strict: true }) || 'page';
    try {
      return await this.model.create({ slug, title: input.title, body: input.body, published: input.published ?? true });
    } catch (e) {
      if ((e as { code?: number }).code === 11000) throw new ConflictException('El slug ya existe');
      throw e;
    }
  }

  async update(id: string, changes: Partial<{ title: string; body: string; published: boolean }>) {
    const page = await this.model.findByIdAndUpdate(id, changes, { new: true }).lean().exec();
    if (!page) throw new NotFoundException('Página no encontrada');
    return page;
  }

  async remove(id: string) {
    const res = await this.model.deleteOne({ _id: id }).exec();
    if (res.deletedCount === 0) throw new NotFoundException('Página no encontrada');
  }
}
