import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { GeoModule } from './geo/geo.module';
import { AiModule } from './ai/ai.module';
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
import { AnalyticsModule } from './analytics/analytics.module';
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
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
    GeoModule,
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
    AiModule,
    NotificationsModule,
    CommunityModule,
    BackstageModule,
    CmsModule,
    ExportsModule,
    BootstrapModule,
    HealthModule,
    AnalyticsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
