import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { TaskCommentsController } from 'src/task-comment/dto/task-comment.controller';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [TasksController, TaskCommentsController],
  providers: [TasksService],
})
export class TasksModule {}
