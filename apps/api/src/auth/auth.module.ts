import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { TokensService } from './tokens.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { OtpCode, OtpCodeSchema } from './schemas/otp-code.schema';
import { RefreshToken, RefreshTokenSchema } from './schemas/refresh-token.schema';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({}),
    MongooseModule.forFeature([
      { name: RefreshToken.name, schema: RefreshTokenSchema },
      { name: OtpCode.name, schema: OtpCodeSchema },
    ]),
  ],
  providers: [AuthService, TokensService, OtpService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService, TokensService],
})
export class AuthModule {}
