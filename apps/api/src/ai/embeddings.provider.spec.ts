import { describe, expect, it } from 'vitest';
import { chooseEmbeddingsProvider, cosineSimilarity, type EmbeddingsProvider } from './embeddings.provider';

function stub(name: string, configured: boolean): EmbeddingsProvider {
  return { name, isConfigured: () => configured, embed: async () => [] };
}

describe('chooseEmbeddingsProvider', () => {
  it('usa el preferido cuando está configurado', () => {
    const chosen = chooseEmbeddingsProvider('gemini', [stub('openai', true), stub('gemini', true)]);
    expect(chosen.name).toBe('gemini');
  });

  it('cae a otro configurado si el preferido no lo está', () => {
    const chosen = chooseEmbeddingsProvider('gemini', [stub('openai', true), stub('gemini', false)]);
    expect(chosen.name).toBe('openai');
  });

  it('devuelve el preferido (aunque no configurado) si ninguno lo está', () => {
    const chosen = chooseEmbeddingsProvider('gemini', [stub('openai', false), stub('gemini', false)]);
    expect(chosen.name).toBe('gemini');
  });
});

describe('cosineSimilarity', () => {
  it('es 1 para vectores idénticos y 0 para ortogonales', () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });
});
