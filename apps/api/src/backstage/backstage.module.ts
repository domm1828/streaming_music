import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Artist, ArtistSchema } from '../catalog/schemas/artist.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { BackstageRequest, BackstageRequestSchema } from './schemas/backstage-request.schema';
import { BackstageService } from './backstage.service';
import { BackstageController } from './backstage.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BackstageRequest.name, schema: BackstageRequestSchema },
      { name: Artist.name, schema: ArtistSchema },
      { name: User.name, schema: UserSchema },
    ]),
    NotificationsModule,
  ],
  providers: [BackstageService],
  controllers: [BackstageController],
})
export class BackstageModule {}
