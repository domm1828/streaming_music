import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { AuthModule } from './auth/auth.module';
import { BootstrapModule } from './bootstrap/bootstrap.module';
import { BackstageModule } from './backstage/backstage.module';
import { CatalogModule } from './catalog/catalog.module';
import { ChannelsModule } from './channels/channels.module';
import { CmsModule } from './cms/cms.module';
import { CommunityModule } from './community/community.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { ExportsModule } from './exports/exports.module';
import { HealthModule } from './health/health.module';
import { LocalizationModule } from './localization/localization.module';
import { MailModule } from './mail/mail.module';
import { MetadataModule } from './metadata/metadata.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PlaylistsModule } from './playlists/playlists.module';
import { ProfilesModule } from './profiles/profiles.module';
import { SearchModule } from './search/search.module';
import { SettingsModule } from './settings/settings.module';
import { SocialModule } from './social/social.module';
import { StorageModule } from './storage/storage.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validate: validateEnv,
      envFilePath: ['.env', '../../.env'],
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('app.mongodbUri'),
      }),
    }),
    MailModule,
    SettingsModule,
    LocalizationModule,
    StorageModule,
    UsersModule,
    AuthModule,
    CatalogModule,
    PlaylistsModule,
    SocialModule,
    ProfilesModule,
    SearchModule,
    ChannelsModule,
    DiscoveryModule,
    MetadataModule,
    NotificationsModule,
    CommunityModule,
    BackstageModule,
    CmsModule,
    ExportsModule,
    BootstrapModule,
    HealthModule,
  ],
})
export class AppModule {}
