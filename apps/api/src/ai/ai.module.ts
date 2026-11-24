import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Track, TrackSchema } from '../catalog/schemas/track.schema';
import { EMBEDDINGS_PROVIDER, OpenAiEmbeddingsProvider } from './embeddings.provider';
import { SemanticService } from './semantic.service';
import { AiController } from './ai.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Track.name, schema: TrackSchema }])],
  providers: [{ provide: EMBEDDINGS_PROVIDER, useClass: OpenAiEmbeddingsProvider }, SemanticService],
  controllers: [AiController],
  exports: [SemanticService],
})
export class AiModule {}
