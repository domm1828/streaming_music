import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SettingsModule } from '../settings/settings.module';
import { StorageService } from './storage.service';
import { ImageGenService } from './image-gen.service';
import { FilesController } from './files.controller';
import { UploadsController } from './uploads.controller';
import { FilesAdminController } from './files-admin.controller';
import { FilesAdminService } from './files-admin.service';
import { FileEntry, FileEntrySchema } from './file-entry.schema';

@Global()
@Module({
  imports: [MongooseModule.forFeature([{ name: FileEntry.name, schema: FileEntrySchema }]), SettingsModule],
  providers: [StorageService, FilesAdminService, ImageGenService],
  controllers: [FilesController, UploadsController, FilesAdminController],
  exports: [StorageService, FilesAdminService, ImageGenService],
})
export class StorageModule {}
