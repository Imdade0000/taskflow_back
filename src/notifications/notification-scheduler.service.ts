// notification-scheduler.service.ts (sans dépendance TasksService)
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly prisma: PrismaService // Utiliser PrismaService directement
  ) {}

  /**
   * Exécute tous les jours à 09:00 pour créer des notifications d'échéances à venir
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleUpcomingDeadlines() {
    this.logger.log('Exécution du job de notifications d\'échéances à venir');
    
    try {
      await this.notificationsService.createUpcomingDeadlineNotifications();
      this.logger.log('Notifications d\'échéances à venir créées avec succès');
    } catch (error) {
      this.logger.error('Erreur lors de la création des notifications d\'échéances:', error);
    }
  }

  /**
   * Exécute tous les jours à 10:00 pour créer des notifications de tâches en retard
   */
  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async handleOverdueTasks() {
    this.logger.log('Exécution du job de notifications de tâches en retard');
    
    try {
      await this.notificationsService.createOverdueTaskNotifications();
      this.logger.log('Notifications de tâches en retard créées avec succès');
    } catch (error) {
      this.logger.error('Erreur lors de la création des notifications de tâches en retard:', error);
    }
  }

  /**
   * Exécute toutes les heures pour créer des rappels de tâches urgentes
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleHourlyTaskReminders() {
    this.logger.log('Exécution du job de rappels horaires');
    
    try {
      await this.createTaskReminders(); // Méthode déplacée ici
      this.logger.log('Rappels horaires créés avec succès');
    } catch (error) {
      this.logger.error('Erreur lors de la création des rappels horaires:', error);
    }
  }

  /**
   * Exécute tous les lundis à 08:00 pour un rappel hebdomadaire
   */
  @Cron(CronExpression.MONDAY_TO_FRIDAY_AT_8AM)
  async handleWeeklyReminders() {
    this.logger.log('Exécution du job de rappels hebdomadaires');
    
    try {
      // Logique pour créer des rappels hebdomadaires spéciaux
      await this.createWeeklyTasksSummary();
      this.logger.log('Rappels hebdomadaires créés avec succès');
    } catch (error) {
      this.logger.error('Erreur lors de la création des rappels hebdomadaires:', error);
    }
  }

  /**
   * Méthode pour créer des rappels automatiques (déplacée depuis TasksService)
   */
  private async createTaskReminders() {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Trouver les tâches dues demain
    const upcomingTasks = await this.prisma.task.findMany({
      where: {
        dueStart: {
          gte: now,
          lte: tomorrow
        },
        // Supposons qu'on filtre les tâches non terminées
        status: {
          name: {
            not: {
              in: ['Terminé', 'Completed', 'Done', 'Fini', 'Finished']
            }
          }
        }
      },
      include: {
        assignees: { select: { memberId: true } }
      }
    });

    for (const task of upcomingTasks) {
      try {
        const assigneeIds = task.assignees.map(a => a.memberId);
        const hoursUntilDeadline = (task.dueStart.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        await this.notificationsService.createDeadlineReminderNotification(
          assigneeIds,
          task.title,
          task.id,
          task.dueStart,
          hoursUntilDeadline
        );
      } catch (error) {
        this.logger.error(`Erreur lors de la création du rappel pour la tâche ${task.id}:`, error);
      }
    }

    return { message: `${upcomingTasks.length} rappels créés` };
  }

  /**
   * Méthode personnalisée pour créer un résumé hebdomadaire des tâches
   */
  private async createWeeklyTasksSummary() {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Récupérer les tâches dues la semaine prochaine
    const upcomingTasks = await this.prisma.task.findMany({
      where: {
        dueStart: {
          gte: now,
          lte: nextWeek
        },
        status: {
          name: {
            not: {
              in: ['Terminé', 'Completed', 'Done', 'Fini', 'Finished']
            }
          }
        }
      },
      include: {
        assignees: {
          include: {
            member: {
              include: {
                user: true
              }
            }
          }
        }
      }
    });

    // Regrouper les tâches par utilisateur
    const tasksByUser = new Map<string, any[]>();
    
    upcomingTasks.forEach(task => {
      task.assignees.forEach(assignee => {
        const userId = assignee.member.userId;
        if (!tasksByUser.has(userId)) {
          tasksByUser.set(userId, []);
        }
        tasksByUser.get(userId)!.push(task);
      });
    });

    // Créer des notifications de résumé pour chaque utilisateur
    for (const [userId, tasks] of tasksByUser) {
      if (tasks.length > 0) {
        const notification = {
          userId,
          title: 'Résumé hebdomadaire',
          content: `Vous avez ${tasks.length} tâche(s) prévue(s) pour la semaine prochaine`,
          type: 'GENERAL' as any // Utiliser le type GENERAL du NotificationType
        };
        
        await this.notificationsService.create(notification);
      }
    }
  }

  /**
   * Méthode manuelle pour déclencher les notifications d'échéances
   * Peut être utilisée pour des tests ou des déclenchements manuels
   */
  async triggerUpcomingDeadlineNotifications() {
    this.logger.log('Déclenchement manuel des notifications d\'échéances');
    await this.handleUpcomingDeadlines();
  }

  /**
   * Méthode manuelle pour déclencher les notifications de tâches en retard
   */
  async triggerOverdueTaskNotifications() {
    this.logger.log('Déclenchement manuel des notifications de tâches en retard');
    await this.handleOverdueTasks();
  }
}