import { describe, expect, it } from 'vitest';
import { uniqueSlug } from './slug';

describe('uniqueSlug', () => {
  it('genera un slug amigable a partir del nombre', async () => {
    const model = { exists: async () => null };
    expect(await uniqueSlug(model, 'Daft Punk')).toBe('daft-punk');
  });

  it('agrega sufijo numérico si el slug ya existe', async () => {
    const taken = new Set(['daft-punk']);
    const model = { exists: async ({ slug }: { slug: string }) => (taken.has(slug) ? {} : null) };
    expect(await uniqueSlug(model, 'Daft Punk')).toBe('daft-punk-1');
  });
});
