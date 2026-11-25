import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OtpCode, OtpCodeSchema } from '../auth/schemas/otp-code.schema';
import { RefreshToken, RefreshTokenSchema } from '../auth/schemas/refresh-token.schema';
import { ExportJob, ExportJobSchema } from '../exports/schemas/export-job.schema';
import { MaintenanceService } from './maintenance.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OtpCode.name, schema: OtpCodeSchema },
      { name: RefreshToken.name, schema: RefreshTokenSchema },
      { name: ExportJob.name, schema: ExportJobSchema },
    ]),
  ],
  providers: [MaintenanceService],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
