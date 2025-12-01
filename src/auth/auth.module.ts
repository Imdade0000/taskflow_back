import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { AuthController } from './auth.controller';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { MailerModule } from 'src/mailler/mailler.module';
import { PermissionsService } from 'src/permissions/permissions.service';

@Global()
@Module({
  imports: [
    MailerModule,
    UsersModule,
    PrismaModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'your-default-secret-key'),
        signOptions: {
          issuer: configService.get<string>('JWT_ISSUER', 'auth-service'),
          audience: configService.get<string>('JWT_AUDIENCE', 'app-client'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LocalStrategy, RefreshTokenGuard, PermissionsService],
  exports: [AuthService, JwtModule, RefreshTokenGuard, PermissionsService],
})
export class AuthModule {}