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

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents';

/** Implementación Google Gemini (text-embedding-004). Graciosa si no hay API key. */
@Injectable()
export class GeminiEmbeddingsProvider implements EmbeddingsProvider {
  readonly name = 'gemini';
  private readonly logger = new Logger(GeminiEmbeddingsProvider.name);
  private readonly apiKey: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<IntegrationsConfig>('integrations')?.geminiApiKey ?? '';
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (!this.isConfigured()) throw new Error('Gemini no está configurado');
    const res = await fetch(`${GEMINI_URL}?key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: texts.map((text) => ({
          model: 'models/text-embedding-004',
          content: { parts: [{ text }] },
        })),
      }),
    });
    if (!res.ok) throw new Error(`Gemini embeddings → ${res.status}`);
    const data = (await res.json()) as { embeddings: { values: number[] }[] };
    return data.embeddings.map((e) => e.values);
  }
}

/**
 * Elige el proveedor de embeddings según la preferencia de config:
 * usa el preferido si está configurado; si no, cae al primero configurado;
 * si ninguno lo está, devuelve el default (degradación graciosa aguas abajo).
 */
export function chooseEmbeddingsProvider<T extends EmbeddingsProvider>(
  preferred: string,
  providers: T[],
): T {
  const byName = providers.find((p) => p.name === preferred);
  if (byName?.isConfigured()) return byName;
  const anyConfigured = providers.find((p) => p.isConfigured());
  return anyConfigured ?? byName ?? providers[0];
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
