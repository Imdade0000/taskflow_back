import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { PrismaModule } from 'src/prisma/prisma.module';
import { NotificationsController } from './notifications.controller';
import { TasksModule } from 'src/tasks/tasks.module';
import { NotificationSchedulerService } from './notification-scheduler.service';


@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [NotificationsGateway, NotificationsService, NotificationSchedulerService],
  exports: [NotificationsGateway, NotificationsService]
})
export class NotificationsModule {}
