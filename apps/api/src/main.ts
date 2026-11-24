import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { join } from 'node:path';
import { Server as TusServer } from '@tus/server';
import { FileStore } from '@tus/file-store';
import { AppModule } from './app.module';
import type { AppConfig } from './config/configuration';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { initSentry } from './observability/sentry';

async function bootstrap() {
  initSentry();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');
  const appConfig = config.get<AppConfig>('app')!;

  // Cabeceras de seguridad. crossOriginResourcePolicy relajado para servir media.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.set('trust proxy', 1);

  // Sirve los archivos subidos (audio, waveforms) con soporte de rango.
  app.useStaticAssets(appConfig.uploadsDir, { prefix: appConfig.uploadsPublicPath });

  // Subidas resumibles (TUS) a disco local.
  const tusPath = '/api/v1/uploads/tus';
  const tus = new TusServer({ path: tusPath, datastore: new FileStore({ directory: join(appConfig.uploadsDir, 'tus') }) });
  const tusHandler = (req: Parameters<typeof tus.handle>[0], res: Parameters<typeof tus.handle>[1]) =>
    tus.handle(req, res);
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.all(tusPath, tusHandler);
  expressApp.all(`${tusPath}/*splat`, tusHandler);

  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: config.get<string>('app.corsOrigin') ?? '*',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  const port = config.get<number>('app.port') ?? 3000;
  await app.listen(port);
  logger.log(`Stream Music API escuchando en http://localhost:${port}/api/v1`);
}

void bootstrap();
