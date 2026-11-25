import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import type { IntegrationsConfig } from '../config/configuration';
import { Track, TrackSchema } from '../catalog/schemas/track.schema';
import {
  chooseEmbeddingsProvider,
  EMBEDDINGS_PROVIDER,
  GeminiEmbeddingsProvider,
  OpenAiEmbeddingsProvider,
} from './embeddings.provider';
import { SemanticService } from './semantic.service';
import { AiController } from './ai.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Track.name, schema: TrackSchema }])],
  providers: [
    {
      provide: EMBEDDINGS_PROVIDER,
      inject: [ConfigService],
      // Selecciona OpenAI o Gemini según AI_EMBEDDINGS_PROVIDER, con degradación graciosa.
      useFactory: (config: ConfigService) => {
        const preferred = config.get<IntegrationsConfig>('integrations')?.embeddingsProvider ?? 'openai';
        return chooseEmbeddingsProvider(preferred, [
          new OpenAiEmbeddingsProvider(config),
          new GeminiEmbeddingsProvider(config),
        ]);
      },
    },
    SemanticService,
  ],
  controllers: [AiController],
  exports: [SemanticService],
})
export class AiModule {}
