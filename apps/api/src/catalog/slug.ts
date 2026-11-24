import slugify from 'slugify';

interface SluggableModel {
  exists(filter: { slug: string }): { exec?: () => Promise<unknown> } | Promise<unknown>;
}

/** Genera un slug único para `name` dentro de la colección del modelo. */
export async function uniqueSlug(model: SluggableModel, name: string): Promise<string> {
  const base = slugify(name, { lower: true, strict: true }) || 'item';
  let candidate = base;
  let i = 1;
  while (await model.exists({ slug: candidate })) {
    candidate = `${base}-${i++}`;
  }
  return candidate;
}
