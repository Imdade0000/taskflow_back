import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { UsersModule } from './users/users.module';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { AuthModule } from './auth/auth.module';
import { RolesService } from './roles/roles.service';
import { RolesModule } from './roles/roles.module';
import { PermissionsController } from './permissions/permissions.controller';
import { PermissionsService } from './permissions/permissions.service';
import { PermissionsModule } from './permissions/permissions.module';
import { ErrorInterceptor } from './auth/interceptors/error.interceptor';
import { LoggingInterceptor } from './auth/interceptors/logging.interceptor';
import { RateLimitInterceptor } from './auth/interceptors/rate-limit.interceptor';
import { RoleInterceptor } from './auth/interceptors/role.interceptor';
import { TimeoutInterceptor } from './auth/interceptors/timeout.interceptor';
import { TransformInterceptor } from './auth/interceptors/transform.interceptor';
import { IsActiveGuard } from './auth/guards/is-active.guard';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { LocalAuthGuard } from './auth/guards/local-auth.guard';
import { RefreshTokenGuard } from './auth/guards/refresh-token.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { TwoFactorAuthGuard } from './auth/guards/two-factor-auth.guard';
import { PrismaExceptionInterceptor } from './auth/interceptors/prisma-exception.interceptor';
import { ConfigModule } from '@nestjs/config';
import { MailerModule } from './mailler/mailler.module';
import { MailerService } from './mailler/mailler.service';
import { ProjectService } from './project/project.service';
import { ProjectModule } from './project/project.module';
import { ProjectStatusModule } from './project/project-status-module';
import { TasksModule } from './tasks/tasks.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './prisma/prisma.module';
import { DashboardModule } from './dashboard/dto/dashboard.module';
import { ScheduleModule } from '@nestjs/schedule';






@Module({
  imports: [ UsersModule, RolesModule, PermissionsModule, ProjectModule, ProjectStatusModule, NotificationsModule, PrismaModule, DashboardModule, ScheduleModule.forRoot(),
    ConfigModule.forRoot({
    isGlobal: true,  
  }), AuthModule, MailerModule, TasksModule],
  controllers: [AppController, AuthController, PermissionsController],
  providers: [AppService, RolesService, PrismaService, PermissionsService, ErrorInterceptor, LoggingInterceptor, ProjectService, AuthService,/* RateLimitInterceptor,*/ RoleInterceptor, TimeoutInterceptor, TransformInterceptor, PrismaExceptionInterceptor,  IsActiveGuard, JwtAuthGuard, LocalAuthGuard, RolesGuard, TwoFactorAuthGuard, MailerService ],
})
export class AppModule {}
