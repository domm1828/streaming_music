import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import type { AppConfig } from './config/configuration';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');
  const appConfig = config.get<AppConfig>('app')!;

  // Sirve los archivos subidos (audio, waveforms) con soporte de rango.
  app.useStaticAssets(appConfig.uploadsDir, { prefix: appConfig.uploadsPublicPath });

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
