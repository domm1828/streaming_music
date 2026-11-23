export interface AppConfig {
  nodeEnv: string;
  port: number;
  mongodbUri: string;
  corsOrigin: string;
}

export default (): { app: AppConfig } => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.PORT ?? '3000', 10),
    mongodbUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/stream_music',
    corsOrigin: process.env.CORS_ORIGIN ?? '*',
  },
});
