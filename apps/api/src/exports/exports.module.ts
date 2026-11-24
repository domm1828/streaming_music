import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Track, TrackSchema } from '../catalog/schemas/track.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Report, ReportSchema } from '../community/schemas/report.schema';
import { ExportJob, ExportJobSchema } from './schemas/export-job.schema';
import { ExportsService } from './exports.service';
import { ExportsController } from './exports.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ExportJob.name, schema: ExportJobSchema },
      { name: User.name, schema: UserSchema },
      { name: Track.name, schema: TrackSchema },
      { name: Report.name, schema: ReportSchema },
    ]),
  ],
  providers: [ExportsService],
  controllers: [ExportsController],
})
export class ExportsModule {}
