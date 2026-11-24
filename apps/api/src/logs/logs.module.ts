import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { LogEntry, LogEntrySchema } from './log-entry.schema';
import { LogsService } from './logs.service';
import { LogsController } from './logs.controller';

@Global()
@Module({
  imports: [JwtModule.register({}), MongooseModule.forFeature([{ name: LogEntry.name, schema: LogEntrySchema }])],
  providers: [LogsService],
  controllers: [LogsController],
  exports: [LogsService],
})
export class LogsModule {}
