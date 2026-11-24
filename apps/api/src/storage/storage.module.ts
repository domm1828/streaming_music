import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { FilesController } from './files.controller';
import { UploadsController } from './uploads.controller';

@Global()
@Module({
  providers: [StorageService],
  controllers: [FilesController, UploadsController],
  exports: [StorageService],
})
export class StorageModule {}
