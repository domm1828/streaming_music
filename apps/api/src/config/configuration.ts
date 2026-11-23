export interface AppConfig {
  nodeEnv: string;
  port: number;
  mongodbUri: string;
  corsOrigin: string;
  appUrl: string;
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

export default (): { app: AppConfig; jwt: JwtConfig; mail: MailConfig } => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.PORT ?? '3000', 10),
    mongodbUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/stream_music',
    corsOrigin: process.env.CORS_ORIGIN ?? '*',
    appUrl: process.env.APP_URL ?? 'http://localhost:5173',
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
});
