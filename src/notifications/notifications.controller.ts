import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Patch, 
  Delete,
  UseGuards,
  Req,
  Query
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth, 
  ApiBody,
  ApiParam,
  ApiQuery
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @ApiOperation({ summary: 'Créer une notification' })
  @ApiResponse({ status: 201, description: 'Notification créée avec succès' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  @ApiBody({ type: CreateNotificationDto })
  async create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationsService.create(createNotificationDto);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Créer plusieurs notifications' })
  @ApiResponse({ status: 201, description: 'Notifications créées avec succès' })
  @ApiBody({ type: [CreateNotificationDto] })
  async createBulk(@Body() notifications: CreateNotificationDto[]) {
    return this.notificationsService.createBulk(notifications);
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer toutes les notifications' })
  @ApiResponse({ status: 200, description: 'Liste des notifications' })
  async findAll() {
    return this.notificationsService.findAll();
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Récupérer les notifications d\'un utilisateur' })
  @ApiResponse({ status: 200, description: 'Notifications de l\'utilisateur' })
  @ApiParam({ name: 'userId', description: 'ID de l\'utilisateur' })
  async findByUser(@Param('userId') userId: string) {
    return this.notificationsService.findByUser(userId);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Nombre de notifications non lues pour l\'utilisateur connecté' })
  @ApiResponse({ status: 200, description: 'Nombre de notifications non lues' })
  async getUnreadCount(@Req() req: any) {
    const userId = req.user.id; // Supposé venir du JWT
    return this.notificationsService.getUnreadCountForUser(userId);
  }

  @Get('user/:userId/unread-count')
  @ApiOperation({ summary: 'Nombre de notifications non lues pour un utilisateur' })
  @ApiResponse({ status: 200, description: 'Nombre de notifications non lues' })
  async getUnreadCountForUser(@Param('userId') userId: string) {
    return this.notificationsService.getUnreadCountForUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une notification par ID' })
  @ApiResponse({ status: 200, description: 'Notification trouvée' })
  @ApiResponse({ status: 404, description: 'Notification non trouvée' })
  async findOne(@Param('id') id: string) {
    return this.notificationsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour une notification' })
  @ApiResponse({ status: 200, description: 'Notification mise à jour' })
  @ApiResponse({ status: 404, description: 'Notification non trouvée' })
  async update(
    @Param('id') id: string,
    @Body() updateNotificationDto: UpdateNotificationDto
  ) {
    return this.notificationsService.update(id, updateNotificationDto);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marquer une notification comme lue' })
  @ApiResponse({ status: 200, description: 'Notification marquée comme lue' })
  async markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Patch('user/:userId/mark-all-read')
  @ApiOperation({ summary: 'Marquer toutes les notifications comme lues pour un utilisateur' })
  @ApiResponse({ status: 200, description: 'Toutes les notifications marquées comme lues' })
  async markAllAsRead(@Param('userId') userId: string) {
    return this.notificationsService.markAllAsReadForUser(userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une notification (soft delete)' })
  @ApiResponse({ status: 200, description: 'Notification supprimée' })
  async remove(@Param('id') id: string) {
    return this.notificationsService.remove(id);
  }

  // ------------------------
  // Endpoints spécifiques pour les tâches
  // ------------------------

  @Post('task-assignment')
  @ApiOperation({ summary: 'Créer des notifications d\'assignation de tâche' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        assignedUserIds: { type: 'array', items: { type: 'string' } },
        taskTitle: { type: 'string' },
        taskId: { type: 'string' }
      }
    }
  })
  async createTaskAssignmentNotification(@Body() body: {
    assignedUserIds: string[];
    taskTitle: string;
    taskId: string;
  }) {
    return this.notificationsService.createTaskAssignmentNotification(
      body.assignedUserIds,
      body.taskTitle,
      body.taskId
    );
  }

  @Post('task-completed')
  @ApiOperation({ summary: 'Créer des notifications de tâche terminée' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        projectMemberIds: { type: 'array', items: { type: 'string' } },
        taskTitle: { type: 'string' },
        taskId: { type: 'string' },
        completedByUserId: { type: 'string' }
      }
    }
  })
  async createTaskCompletedNotification(@Body() body: {
    projectMemberIds: string[];
    taskTitle: string;
    taskId: string;
    completedByUserId?: string;
  }) {
    return this.notificationsService.createTaskCompletedNotification(
      body.projectMemberIds,
      body.taskTitle,
      body.taskId,
      body.completedByUserId
    );
  }

  @Post('task-comment')
  @ApiOperation({ summary: 'Créer des notifications de nouveau commentaire' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        taskTitle: { type: 'string' },
        commentContent: { type: 'string' },
        commentAuthorId: { type: 'string' },
        assignedProjectMemberIds: { type: 'array', items: { type: 'string' } }
      }
    }
  })
  async createTaskCommentNotification(@Body() body: {
    taskId: string;
    taskTitle: string;
    commentContent: string;
    commentAuthorId: string;
    assignedProjectMemberIds: string[];
  }) {
    return this.notificationsService.createTaskCommentNotification(
      body.taskId,
      body.taskTitle,
      body.commentContent,
      body.commentAuthorId,
      body.assignedProjectMemberIds
    );
  }

  @Post('task-reminder')
  @ApiOperation({ summary: 'Créer des notifications de rappel de tâche' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        assignedProjectMemberIds: { type: 'array', items: { type: 'string' } },
        taskTitle: { type: 'string' },
        taskId: { type: 'string' },
        reminderType: { type: 'string', enum: ['DUE_SOON', 'OVERDUE'] }
      }
    }
  })
  async createTaskReminderNotification(@Body() body: {
    assignedProjectMemberIds: string[];
    taskTitle: string;
    taskId: string;
    reminderType?: 'DUE_SOON' | 'OVERDUE';
  }) {
    return this.notificationsService.createTaskReminderNotification(
      body.assignedProjectMemberIds,
      body.taskTitle,
      body.taskId,
      body.reminderType
    );
  }

  @Post('deadline-reminder')
  @ApiOperation({ summary: 'Créer des notifications de rappel d\'échéance' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        projectMemberIds: { type: 'array', items: { type: 'string' } },
        taskTitle: { type: 'string' },
        taskId: { type: 'string' },
        dueDate: { type: 'string', format: 'date-time' },
        hoursUntilDeadline: { type: 'number' }
      }
    }
  })
  async createDeadlineReminderNotification(@Body() body: {
    projectMemberIds: string[];
    taskTitle: string;
    taskId: string;
    dueDate: string;
    hoursUntilDeadline: number;
  }) {
    return this.notificationsService.createDeadlineReminderNotification(
      body.projectMemberIds,
      body.taskTitle,
      body.taskId,
      new Date(body.dueDate),
      body.hoursUntilDeadline
    );
  }

  // ------------------------
  // Endpoints spécifiques pour les projets
  // ------------------------

  @Post('project-update')
  @ApiOperation({ summary: 'Créer des notifications de mise à jour de projet' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        projectName: { type: 'string' },
        updateMessage: { type: 'string' },
        updatedByUserId: { type: 'string' }
      }
    }
  })
  async createProjectUpdateNotification(@Body() body: {
    projectId: string;
    projectName: string;
    updateMessage: string;
    updatedByUserId?: string;
  }) {
    return this.notificationsService.createProjectUpdateNotification(
      body.projectId,
      body.projectName,
      body.updateMessage,
      body.updatedByUserId
    );
  }

  // ------------------------
  // Endpoints pour la gestion automatique
  // ------------------------

  @Post('cron/upcoming-deadlines')
  @ApiOperation({ 
    summary: 'Créer des notifications automatiques pour les échéances à venir',
    description: 'Endpoint destiné à être appelé par un cron job'
  })
  async createUpcomingDeadlineNotifications() {
    return this.notificationsService.createUpcomingDeadlineNotifications();
  }

  @Post('cron/overdue-tasks')
  @ApiOperation({ 
    summary: 'Créer des notifications automatiques pour les tâches en retard',
    description: 'Endpoint destiné à être appelé par un cron job'
  })
  async createOverdueTaskNotifications() {
    return this.notificationsService.createOverdueTaskNotifications();
  }
}