// project-role.module.ts
import { Module } from '@nestjs/common';
import { ProjectRoleController } from './project-role.controller';
import { ProjectRoleService } from './Project-role.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProjectRoleController],
  providers: [ProjectRoleService],
  exports: [ProjectRoleService],
})
export class ProjectRoleModule {}