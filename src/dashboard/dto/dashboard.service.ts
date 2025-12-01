import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { DashboardStatsDto, RecentProjectDto, ProductivityDataDto, RecentTaskDto } from './dashboard-stats.dto';
import { map } from 'rxjs';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats(): Promise<DashboardStatsDto> {
    // Compter les tâches
    const totalTasks = await this.prisma.task.count({
      where: { deletedAt: null }
    });

    const completedTasks = await this.prisma.task.count({
      where: { 
        status: {
          name: 'Terminé'
        },
        deletedAt: null
      }
    });

    const pendingTasks = totalTasks - completedTasks;

    // Tâches en retard (non complétées avec dueEnd dépassé)
    const overdueTasks = await this.prisma.task.count({
      where: {
        status: {
          name: { not: 'Terminé' }
        },
        dueEnd: { lt: new Date() },
        deletedAt: null
      }
    });

    // Compter les projets
    const totalProjects = await this.prisma.project.count({
      where: { deletedAt: null }
    });

    const activeProjects = await this.prisma.project.count({
      where: { 
        isArchived: false,
        deletedAt: null
      }
    });

    // Compter les membres actifs
    const totalMembers = await this.prisma.user.count({
      where: { 
        isActive: true,
        deletedAt: null
      }
    });

    // Taux de complétion
    const completionRate = totalTasks > 0 
      ? Math.round((completedTasks / totalTasks) * 100) 
      : 0;

    // Progression hebdomadaire
    const weeklyProgress = await this.getWeeklyProgress();

    // Distribution des priorités
    const priorities = await this.prisma.taskPriority.findMany({
      where: { deletedAt: null }
    });

    const priorityDistribution = {
      high: 0,
      medium: 0,
      low: 0
    };

    for (const priority of priorities) {
      const count = await this.prisma.task.count({
        where: { 
          priorityId: priority.id,
          deletedAt: null
        }
      });

      const priorityName = priority.name.toLowerCase();
  
  // Support pour les noms en français et anglais
  if (priorityName.includes('high') || priorityName.includes('haute') || priorityName.includes('élevé')) {
    priorityDistribution.high = count;
  } else if (priorityName.includes('medium') || priorityName.includes('moyen') || priorityName.includes('normale')) {
    priorityDistribution.medium = count;
  } else if (priorityName.includes('low') || priorityName.includes('basse') || priorityName.includes('faible')) {
    priorityDistribution.low = count;
  }
}

    // Distribution des statuts
    const statuses = await this.prisma.taskStatus.findMany({
      where: { deletedAt: null }
    });

    const statusDistribution: { [key: string]: number } = {};
    for (const status of statuses) {
      const count = await this.prisma.task.count({
        where: { 
          statusId: status.id,
          deletedAt: null
        }
      });
      statusDistribution[status.name] = count;
    }

    return {
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
      totalProjects,
      activeProjects,
      totalMembers,
      completionRate,
      weeklyProgress,
      priorityDistribution,
      statusDistribution
    };
  }

  async getProductivityData(period: '7d' | '30d' | '3m' = '30d'): Promise<ProductivityDataDto[]> {
  const endDate = new Date();
  let startDate = new Date();

  switch (period) {
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '3m':
      startDate.setMonth(startDate.getMonth() - 3);
      break;
  }

  const productivityData: ProductivityDataDto[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];
    
    // PROBLÈME ICI : vous modifiez currentDate avec setHours, ce qui affecte la boucle
    const dayStart = new Date(currentDate);
    dayStart.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(currentDate);
    dayEnd.setHours(23, 59, 59, 999);
    
    const completedTasks = await this.prisma.task.count({
      where: {
        status: {
          name: 'Terminé'
        },
        updatedAt: {
          gte: dayStart,
          lte: dayEnd
        },
        deletedAt: null
      }
    });

    productivityData.push({
      date: dateStr,
      completedTasks
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return productivityData;
}

  async getRecentTasks(limit: number = 5): Promise<RecentTaskDto[]> {
    const tasks = await this.prisma.task.findMany({
      where: { deletedAt: null },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        status: true,
        priority: true,
        project: {
          select: { name: true }
        },
        assignees: {
          include: {
            member: {
              include: {
                user: {
                  select: {
                    firstname: true,
                    lastname: true
                  }
                }
              }
            }
          }
        }
      }
    });

    return tasks.map(task => ({
      id: task.id,
      title: task.title,
      status: task.status.name,
      priority: task.priority.name,
      dueStart: task.dueStart,
      project: task.project ? { name: task.project.name } : undefined,
      assignees: task.assignees
    }));
  }

  async getRecentProjects(limit: number = 4): Promise<RecentProjectDto[]> {
    const projects = await this.prisma.project.findMany({
      where: { 
        deletedAt: null,
        isArchived: false
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        status: true,
        tasks: {
          where: { deletedAt: null },
          select: {
            status: true
          }
        }
      }
    });

    return projects.map(project => {
      const totalTasks = project.tasks.length;
      const completedTasks = project.tasks.filter(task => 
        task.status.name === 'Terminé'
      ).length;
      
      const progress = totalTasks > 0 
        ? Math.round((completedTasks / totalTasks) * 100) 
        : 0;

      return {
        id: project.id,
        name: project.name,
        status: project.status.name,
        startDate: project.startDate,
        endDate: project.endDate,
        progress
      };
    });
  }

  private async getWeeklyProgress(): Promise<number[]> {
    const weeklyProgress: number[] = [];
    const today = new Date();
    
    // Pour chaque jour de la semaine (du lundi au dimanche)
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - (6 - i)); // Du lundi au dimanche de cette semaine
      
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));

      const tasksCompleted = await this.prisma.task.count({
        where: {
          status: {
            name: 'Terminé'
          },
          updatedAt: {
            gte: startOfDay,
            lte: endOfDay
          },
          deletedAt: null
        }
      });

      weeklyProgress.push(tasksCompleted);
    }

    return weeklyProgress;
  }
}