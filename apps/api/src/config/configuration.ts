import { join } from 'node:path';

export interface AppConfig {
  nodeEnv: string;
  port: number;
  mongodbUri: string;
  corsOrigin: string;
  appUrl: string;
  uploadsDir: string;
  uploadsPublicPath: string;
}

export interface JwtConfig {
  accessSecret: string;
  refreshSecret: string;
  accessTtl: string;
  refreshTtl: string;
}

export interface MailConfig {
  host: string;
  port: number;
  from: string;
}

export interface FeaturesConfig {
  /** Límite mensual de minutos de escucha. 0 = ilimitado. */
  listenMinutesLimit: number;
}

export interface SearchConfig {
  /** 'auto' usa Meilisearch si está configurado/accesible, si no cae a Mongo. */
  driver: 'auto' | 'meili' | 'mongo';
  meiliHost: string;
  meiliKey: string;
}

export interface IntegrationsConfig {
  spotifyClientId: string;
  spotifyClientSecret: string;
  lastfmApiKey: string;
  openaiApiKey: string;
  geminiApiKey: string;
  /** Proveedor de embeddings preferido: 'openai' | 'gemini'. */
  embeddingsProvider: string;
  googleClientId: string;
  googleClientSecret: string;
  facebookClientId: string;
  facebookClientSecret: string;
  twitterClientId: string;
  twitterClientSecret: string;
  sentryDsn: string;
}

export interface StorageConfig {
  driver: 'local' | 's3';
  s3Endpoint: string;
  s3Region: string;
  s3Bucket: string;
  s3AccessKey: string;
  s3SecretKey: string;
  /** Secreto para firmar URLs de archivos privados (driver local). */
  signingSecret: string;
}

export default (): {
  app: AppConfig;
  jwt: JwtConfig;
  mail: MailConfig;
  features: FeaturesConfig;
  search: SearchConfig;
  integrations: IntegrationsConfig;
  storage: StorageConfig;
} => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.PORT ?? '3000', 10),
    mongodbUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/stream_music',
    corsOrigin: process.env.CORS_ORIGIN ?? '*',
    appUrl: process.env.APP_URL ?? 'http://localhost:5173',
    uploadsDir: process.env.STORAGE_DIR ?? join(process.cwd(), 'storage'),
    uploadsPublicPath: '/uploads',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '30d',
  },
  mail: {
    host: process.env.MAIL_HOST ?? 'localhost',
    port: parseInt(process.env.MAIL_PORT ?? '1025', 10),
    from: process.env.MAIL_FROM ?? 'Stream Music <no-reply@streammusic.local>',
  },
  features: {
    listenMinutesLimit: parseInt(process.env.LISTEN_MINUTES_LIMIT ?? '0', 10),
  },
  search: {
    driver: (process.env.SEARCH_DRIVER as 'auto' | 'meili' | 'mongo') ?? 'auto',
    meiliHost: process.env.MEILI_HOST ?? '',
    meiliKey: process.env.MEILI_MASTER_KEY ?? '',
  },
  integrations: {
    spotifyClientId: process.env.SPOTIFY_CLIENT_ID ?? '',
    spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET ?? '',
    lastfmApiKey: process.env.LASTFM_API_KEY ?? '',
    openaiApiKey: process.env.OPENAI_API_KEY ?? '',
    geminiApiKey: process.env.GEMINI_API_KEY ?? '',
    embeddingsProvider: process.env.AI_EMBEDDINGS_PROVIDER ?? 'openai',
    googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    facebookClientId: process.env.FACEBOOK_CLIENT_ID ?? '',
    facebookClientSecret: process.env.FACEBOOK_CLIENT_SECRET ?? '',
    twitterClientId: process.env.TWITTER_CLIENT_ID ?? '',
    twitterClientSecret: process.env.TWITTER_CLIENT_SECRET ?? '',
    sentryDsn: process.env.SENTRY_DSN ?? '',
  },
  storage: {
    driver: (process.env.STORAGE_DRIVER as 'local' | 's3') ?? 'local',
    s3Endpoint: process.env.S3_ENDPOINT ?? '',
    s3Region: process.env.S3_REGION ?? 'us-east-1',
    s3Bucket: process.env.S3_BUCKET ?? '',
    s3AccessKey: process.env.S3_ACCESS_KEY ?? '',
    s3SecretKey: process.env.S3_SECRET_KEY ?? '',
    signingSecret: process.env.STORAGE_SIGNING_SECRET ?? process.env.JWT_ACCESS_SECRET ?? 'dev-signing-secret',
  },
});
