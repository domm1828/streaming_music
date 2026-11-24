import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IntegrationsConfig } from '../config/configuration';

/** Proveedor de embeddings de texto (abstracción configurable). */
export interface EmbeddingsProvider {
  readonly name: string;
  isConfigured(): boolean;
  embed(texts: string[]): Promise<number[][]>;
}

export const EMBEDDINGS_PROVIDER = Symbol('EMBEDDINGS_PROVIDER');

const OPENAI_URL = 'https://api.openai.com/v1/embeddings';
const MODEL = 'text-embedding-3-small';

/** Implementación OpenAI (vía fetch). Graciosa si no hay API key. */
@Injectable()
export class OpenAiEmbeddingsProvider implements EmbeddingsProvider {
  readonly name = 'openai';
  private readonly logger = new Logger(OpenAiEmbeddingsProvider.name);
  private readonly apiKey: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<IntegrationsConfig>('integrations')?.openaiApiKey ?? '';
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (!this.isConfigured()) throw new Error('OpenAI no está configurado');
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, input: texts }),
    });
    if (!res.ok) throw new Error(`OpenAI embeddings → ${res.status}`);
    const data = (await res.json()) as { data: { embedding: number[] }[] };
    return data.data.map((d) => d.embedding);
  }
}

/** Similitud coseno entre dos vectores. */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}
