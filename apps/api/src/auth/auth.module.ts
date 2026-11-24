import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { TokensService } from './tokens.service';
import { TwoFactorService } from './two-factor.service';
import { TwoFactorController } from './two-factor.controller';
import { SocialAuthService } from './social-auth.service';
import { SocialAuthController } from './social-auth.controller';
import { GoogleOAuthService } from './google-oauth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ApiTokenStrategy } from './strategies/api-token.strategy';
import { ApiTokensService } from './api-tokens.service';
import { ApiTokensController } from './api-tokens.controller';
import { OtpCode, OtpCodeSchema } from './schemas/otp-code.schema';
import { RefreshToken, RefreshTokenSchema } from './schemas/refresh-token.schema';
import { SocialProfile, SocialProfileSchema } from './schemas/social-profile.schema';
import { ApiToken, ApiTokenSchema } from './schemas/api-token.schema';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({}),
    MongooseModule.forFeature([
      { name: RefreshToken.name, schema: RefreshTokenSchema },
      { name: OtpCode.name, schema: OtpCodeSchema },
      { name: SocialProfile.name, schema: SocialProfileSchema },
      { name: ApiToken.name, schema: ApiTokenSchema },
    ]),
  ],
  providers: [
    AuthService,
    TokensService,
    ApiTokensService,
    OtpService,
    TwoFactorService,
    SocialAuthService,
    GoogleOAuthService,
    JwtStrategy,
    ApiTokenStrategy,
  ],
  controllers: [AuthController, TwoFactorController, SocialAuthController, ApiTokensController],
  exports: [AuthService, TokensService],
})
export class AuthModule {}
