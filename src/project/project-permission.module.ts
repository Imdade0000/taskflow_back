// project-permission.module.ts
import { Module } from '@nestjs/common';
import { ProjectPermissionController } from './project-permission.controller';
import { ProjectPermissionService } from './project-permission.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsService } from 'src/permissions/permissions.service';
import { PermissionsGuard } from 'src/permissions/permissions.guard';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ProjectPermissionController],
  providers: [ProjectPermissionService, PermissionsService, PermissionsGuard],
  exports: [ProjectPermissionService],
})
export class ProjectPermissionModule {}