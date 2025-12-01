// notifications.service.ts (corrigé)
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto, NotificationType } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private notificationsGateway: NotificationsGateway
  ) {}

  async create(createNotificationDto: CreateNotificationDto) {
    // Vérifier que l'utilisateur existe
    const userExists = await this.prisma.user.findUnique({
      where: { id: createNotificationDto.userId },
    });
    if (!userExists) {
      throw new NotFoundException(`Utilisateur ${createNotificationDto.userId} non trouvé`);
    }

    const notification = await this.prisma.notification.create({
      data: {
        ...createNotificationDto,
        isRead: createNotificationDto.isRead ?? false,
      },
      include: {
        user: {
          select: { id: true, firstname: true, lastname: true, email: true },
        },
      },
    });

    // Envoyer via WebSocket
    this.notificationsGateway.sendNotificationToUser(
      createNotificationDto.userId,
      notification
    );

    return notification;
  }

  async createBulk(notifications: CreateNotificationDto[]) {
    // Filtrer les notifications avec userId valides
    const validUserIds = await this.prisma.user.findMany({
      where: { id: { in: notifications.map(n => n.userId) } },
      select: { id: true },
    });
    const validIdsSet = new Set(validUserIds.map(u => u.id));

    const filteredNotifications = notifications.filter(n => validIdsSet.has(n.userId));

    const createdNotifications = await this.prisma.notification.createMany({
      data: filteredNotifications.map(n => ({
        ...n,
        isRead: n.isRead ?? false,
      })),
    });

    // Envoyer les notifications via WebSocket
    for (const notif of filteredNotifications) {
      this.notificationsGateway.sendNotificationToUser(notif.userId, notif);
    }

    return createdNotifications;
  }

  async findAll() {
    return this.prisma.notification.findMany({
      where: { deletedAt: null },
      include: {
        user: { select: { id: true, firstname: true, lastname: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
      include: { user: { select: { id: true, firstname: true, lastname: true, email: true } } },
    });

    if (!notification || notification.deletedAt) {
      throw new NotFoundException('Notification non trouvée');
    }

    return notification;
  }

  async update(id: string, updateNotificationDto: UpdateNotificationDto) {
    await this.findOne(id);

    return this.prisma.notification.update({
      where: { id },
      data: updateNotificationDto,
      include: { user: { select: { id: true, firstname: true, lastname: true, email: true } } },
    });
  }

  async markAsRead(id: string) {
    return this.update(id, { isRead: true });
  }

  async markAllAsReadForUser(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false, deletedAt: null },
      data: { isRead: true },
    });
  }

  async getUnreadCountForUser(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false, deletedAt: null },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.notification.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ------------------------
  // Notifications spécifiques pour les tâches
  // ------------------------

  async createTaskAssignmentNotification(
  userIds: string[],  // Changer pour accepter des userIds directement
  taskTitle: string,
  taskId: string
) {
  // Vérifier que les utilisateurs existent
  const validUsers = await this.prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true },
  });

  const validUserIds = validUsers.map(user => user.id);

  const notifications: CreateNotificationDto[] = validUserIds.map(userId => ({
    userId,
    title: 'Tâche assignée',
    content: `Vous avez été assigné à la tâche "${taskTitle}"`,
    type: NotificationType.TASK_ASSIGNED,
    taskId,
  }));

  return this.createBulk(notifications);
}

   async createTaskCompletedNotification(
    memberIds: string[],
    taskTitle: string,
    taskId: string,
    completedByUserId?: string
  ) {
    // Convertir les memberIds en userIds
    const projectMembers = await this.prisma.projectMember.findMany({
      where: { id: { in: memberIds } },
      select: { userId: true },
    });

    // Récupérer les infos de l'utilisateur qui a terminé la tâche
    let completedByUser: { firstname: string; lastname: string } | null = null;
    if (completedByUserId) {
      completedByUser = await this.prisma.user.findUnique({
        where: { id: completedByUserId },
        select: { firstname: true, lastname: true }
      });
    }

    const completedByName = completedByUser 
      ? `${completedByUser.firstname} ${completedByUser.lastname}` 
      : 'Un membre de l\'équipe';

    const userIds = projectMembers
      .map(pm => pm.userId)
      // Exclure l'utilisateur qui a terminé la tâche pour éviter l'auto-notification
      .filter(userId => userId !== completedByUserId);

    const notifications: CreateNotificationDto[] = userIds.map(userId => ({
      userId,
      title: 'Tâche terminée',
      content: `La tâche "${taskTitle}" a été terminée par ${completedByName}`,
      type: NotificationType.TASK_COMPLETED,
      taskId,
    }));

    return this.createBulk(notifications);
  }

  async createTaskCommentNotification(
    taskId: string,
    taskTitle: string,
    commentContent: string,
    commentAuthorId: string,
    assignedProjectMemberIds: string[]
  ) {
    // Récupérer les infos de l'auteur du commentaire
    const commentAuthor: { firstname: string; lastname: string } | null = await this.prisma.user.findUnique({
      where: { id: commentAuthorId },
      select: { firstname: true, lastname: true }
    });

    const authorName = commentAuthor 
      ? `${commentAuthor.firstname} ${commentAuthor.lastname}` 
      : 'Un membre de l\'équipe';

    const projectMembers = await this.prisma.projectMember.findMany({
      where: { id: { in: assignedProjectMemberIds } },
      select: { userId: true },
    });

    const userIds = projectMembers
      .map(pm => pm.userId)
      // Exclure l'auteur du commentaire pour éviter l'auto-notification
      .filter(userId => userId !== commentAuthorId);

    // Limiter le contenu du commentaire à 100 caractères pour la notification
    const truncatedContent = commentContent.length > 100 
      ? commentContent.substring(0, 100) + '...' 
      : commentContent;

    const notifications: CreateNotificationDto[] = userIds.map(userId => ({
      userId,
      title: 'Nouveau commentaire',
      content: `${authorName} a commenté la tâche "${taskTitle}": "${truncatedContent}"`,
      type: NotificationType.TASK_COMMENT,
      taskId,
    }));

    return this.createBulk(notifications);
  }

  async createTaskReminderNotification(
    assignedProjectMemberIds: string[],
    taskTitle: string,
    taskId: string,
    reminderType: 'DUE_SOON' | 'OVERDUE' = 'DUE_SOON'
  ) {
    const projectMembers = await this.prisma.projectMember.findMany({
      where: { id: { in: assignedProjectMemberIds } },
      select: { userId: true },
    });

    const userIds = projectMembers.map(pm => pm.userId);

    const title = reminderType === 'OVERDUE' ? 'Tâche en retard' : 'Rappel de tâche';
    const content = reminderType === 'OVERDUE' 
      ? `La tâche "${taskTitle}" est en retard. Veuillez la finaliser dès que possible.`
      : `La tâche "${taskTitle}" doit être terminée bientôt. N'oubliez pas de la compléter.`;

    const notifications: CreateNotificationDto[] = userIds.map(userId => ({
      userId,
      title,
      content,
      type: NotificationType.TASK_REMINDER,
      taskId,
    }));

    return this.createBulk(notifications);
  }

  async createDeadlineReminderNotification(
    projectMemberIds: string[],
    taskTitle: string,
    taskId: string,
    dueDate: Date,
    hoursUntilDeadline: number
  ) {
    const projectMembers = await this.prisma.projectMember.findMany({
      where: { id: { in: projectMemberIds } },
      select: { userId: true },
    });

    const userIds = projectMembers.map(pm => pm.userId);

    const timeText = hoursUntilDeadline < 24 
      ? `${Math.round(hoursUntilDeadline)} heures`
      : `${Math.round(hoursUntilDeadline / 24)} jours`;

    const notifications: CreateNotificationDto[] = userIds.map(userId => ({
      userId,
      title: 'Échéance approche',
      content: `La tâche "${taskTitle}" doit être terminée dans ${timeText} (${dueDate.toLocaleDateString('fr-FR')})`,
      type: NotificationType.DEADLINE_REMINDER,
      taskId,
    }));

    return this.createBulk(notifications);
  }

  // ------------------------
  // Notifications spécifiques pour les projets
  // ------------------------

  async createProjectUpdateNotification(
    projectId: string,
    projectName: string,
    updateMessage: string,
    updatedByUserId?: string
  ) {
    // Récupérer tous les membres du projet
    const projectMembers = await this.prisma.projectMember.findMany({
      where: { 
        projectId: projectId,
        isActive: true 
      },
      select: { userId: true },
    });

    // Récupérer les infos de l'utilisateur qui a fait la mise à jour
    let updatedByUser: { firstname: string; lastname: string } | null = null;
    if (updatedByUserId) {
      updatedByUser = await this.prisma.user.findUnique({
        where: { id: updatedByUserId },
        select: { firstname: true, lastname: true }
      });
    }

    const updatedByName = updatedByUser 
      ? `${updatedByUser.firstname} ${updatedByUser.lastname}` 
      : 'L\'équipe de gestion';

    const userIds = projectMembers
      .map(pm => pm.userId)
      // Exclure l'utilisateur qui a fait la mise à jour
      .filter(userId => userId !== updatedByUserId);

    const notifications: CreateNotificationDto[] = userIds.map(userId => ({
      userId,
      title: 'Mise à jour du projet',
      content: `${updatedByName} a mis à jour le projet "${projectName}": ${updateMessage}`,
      type: NotificationType.PROJECT_UPDATE,
      projectId,
    }));

    return this.createBulk(notifications);
  }

  // ------------------------
  // Méthodes utilitaires pour la gestion automatique des notifications
  // ------------------------

  /**
   * Créer des notifications automatiques basées sur les échéances
   * Cette méthode peut être appelée par un cron job
   */
  async createUpcomingDeadlineNotifications() {
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    // Trouver les tâches avec échéance dans les prochaines 24-48 heures
    const upcomingTasks = await this.prisma.task.findMany({
      where: {
        dueStart: {
          gte: in24Hours,
          lte: in48Hours
        },
        // Supposer qu'il y a un champ pour indiquer si la tâche est complétée
        // status: { NOT: { name: 'COMPLETED' } }
      },
      include: {
        assignees: {
          select: { memberId: true }
        }
      }
    });

    for (const task of upcomingTasks) {
      const assignedMemberIds = task.assignees.map(a => a.memberId);
      const hoursUntilDeadline = (task.dueStart.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      await this.createDeadlineReminderNotification(
        assignedMemberIds,
        task.title,
        task.id,
        task.dueStart,
        hoursUntilDeadline
      );
    }
  }

  /**
   * Créer des notifications pour les tâches en retard
   */
  async createOverdueTaskNotifications() {
    const now = new Date();

    const overdueTasks = await this.prisma.task.findMany({
      where: {
        dueStart: {
          lt: now
        },
        // status: { NOT: { name: 'COMPLETED' } }
      },
      include: {
        assignees: {
          select: { memberId: true }
        }
      }
    });

    for (const task of overdueTasks) {
      const assignedMemberIds = task.assignees.map(a => a.memberId);
      
      await this.createTaskReminderNotification(
        assignedMemberIds,
        task.title,
        task.id,
        'OVERDUE'
      );
    }
  }
}