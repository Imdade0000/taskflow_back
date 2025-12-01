import { Module } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { ProjectMemberModule } from './project-member.module';
import { ProjectRoleModule } from './project-role.module';
import { ProjectPermissionModule } from './project-permission.module';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    ProjectMemberModule,
    ProjectRoleModule,
    ProjectPermissionModule,
  ],
  controllers: [ProjectController],
  providers: [ProjectService, PrismaService],
  exports: [ProjectService],
})
export class ProjectModule {}