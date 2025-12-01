import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';    
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Prisma } from '@prisma/client';
import { CreateTaskStatusDto } from 'src/task-status/dto/create-task-status.dto';
import { UpdateTaskStatusDto } from 'src/task-status/dto/update-task-status.dto';
import { CreateTimelineDto } from 'src/timeline/dto/create-timeline.dto';
import { UpdateTimelineDto } from 'src/timeline/dto/update-timeline.dto';
import { CreateTaskPriorityDto } from 'src/task-priority/dto/create-task-priority.dto';
import { UpdateTaskPriorityDto } from 'src/task-priority/dto/update-task-priority.dto';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService
  ) {}

  async create(createTaskDto: CreateTaskDto) {
    await this.validateTaskRelations(createTaskDto);

    const taskData: Prisma.TaskCreateInput = {
      title: createTaskDto.title,
      description: createTaskDto.description,
      dueStart: createTaskDto.dueStart,
      priority: { connect: { id: createTaskDto.priorityId } },
      status: { connect: { id: createTaskDto.statusId } },
      project: { connect: { id: createTaskDto.projectId } },
    };

    // Ajout des champs optionnels
    if (createTaskDto.dueEnd) taskData.dueEnd = createTaskDto.dueEnd;
    if (createTaskDto.startDate) taskData.startDate = createTaskDto.startDate;
    if (createTaskDto.endDate) taskData.endDate = createTaskDto.endDate;
    if (createTaskDto.estimatedHours) taskData.estimatedHours = createTaskDto.estimatedHours;
    if (createTaskDto.timelineId) {
      taskData.timeline = { connect: { id: createTaskDto.timelineId } };
    }
    if (createTaskDto.createdById) {
      taskData.createdBy = { connect: { id: createTaskDto.createdById } };
    }

    const task = await this.prisma.task.create({
      data: taskData,
    });

    // Assigner les membres et créer les notifications
    if (createTaskDto.assigneeIds?.length) {
  await this.assignTaskMembers(task.id, createTaskDto.assigneeIds);
  
  // Convertir les memberIds en userIds
  const projectMembers = await this.prisma.projectMember.findMany({
    where: { id: { in: createTaskDto.assigneeIds } },
    select: { userId: true },
  });
  
  const userIds = projectMembers.map(pm => pm.userId);

  // Créer des notifications d'assignation de tâche
  try {
    await this.notificationsService.createTaskAssignmentNotification(
      userIds,  // Maintenant on passe les userIds
      task.title,
      task.id
    );
  } catch (error) {
    console.error('Erreur lors de la création des notifications d\'assignation:', error);
  }
}

    return this.getTaskWithDetails(task.id);
  }

  async findAll(filters?: {
    projectId?: string;
    statusId?: string;
    timelineId?: string;
    search?: string;
  }) {
    const where: Prisma.TaskWhereInput = {};

    if (filters?.projectId) where.projectId = filters.projectId;
    if (filters?.statusId) where.statusId = filters.statusId;
    if (filters?.timelineId) where.timelineId = filters.timelineId;

    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search } },
        { description: { contains: filters.search} },
      ];
    }

    return this.prisma.task.findMany({
      where,
      include: this.getDefaultIncludes(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: this.getFullIncludes(),
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto) {
    await this.validateTaskExists(id);

    // Récupérer l'état actuel de la tâche pour comparer les changements
    const currentTask = await this.prisma.task.findUnique({
      where: { id },
      include: {
        assignees: { select: { memberId: true } },
        status: { select: { name: true } }
      }
    });

    const updateData: Prisma.TaskUpdateInput = {};

    // Ajout des champs conditionnels
    if (updateTaskDto.title !== undefined) updateData.title = updateTaskDto.title;
    if (updateTaskDto.description !== undefined) updateData.description = updateTaskDto.description;
    if (updateTaskDto.dueStart) updateData.dueStart = updateTaskDto.dueStart;
    if (updateTaskDto.dueEnd) updateData.dueEnd = updateTaskDto.dueEnd;
    if (updateTaskDto.startDate) updateData.startDate = updateTaskDto.startDate;
    if (updateTaskDto.endDate) updateData.endDate = updateTaskDto.endDate;
    if (updateTaskDto.estimatedHours !== undefined) updateData.estimatedHours = updateTaskDto.estimatedHours;
    if (updateTaskDto.actualHours !== undefined) updateData.actualHours = updateTaskDto.actualHours;

    let statusChanged = false;
    let newStatusName = '';

    if (updateTaskDto.statusId) {
      await this.validateStatus(updateTaskDto.statusId);
      updateData.status = { connect: { id: updateTaskDto.statusId } };
      
      // Vérifier si le statut a changé
      const newStatus = await this.prisma.taskStatus.findUnique({
        where: { id: updateTaskDto.statusId },
        select: { name: true }
      });
      
      if (newStatus && currentTask?.status.name !== newStatus.name) {
        statusChanged = true;
        newStatusName = newStatus.name;
      }
    }

    if (updateTaskDto.priorityId) {
      await this.validatePriority(updateTaskDto.priorityId);
      updateData.priority = { connect: { id: updateTaskDto.priorityId } };
    }

    if (updateTaskDto.timelineId) {
      await this.validateTimeline(updateTaskDto.timelineId);
      updateData.timeline = { connect: { id: updateTaskDto.timelineId } };
    }

    await this.prisma.task.update({
      where: { id },
      data: updateData,
    });

    // Gérer les changements d'assignation
   if (updateTaskDto.assigneeIds !== undefined) {
  const currentAssigneeIds = currentTask?.assignees.map(a => a.memberId) || [];
  await this.syncTaskAssignees(id, updateTaskDto.assigneeIds);
  
  // Convertir les nouveaux memberIds en userIds
  const newProjectMembers = await this.prisma.projectMember.findMany({
    where: { id: { in: updateTaskDto.assigneeIds } },
    select: { userId: true },
  });
  
  const newUserIds = newProjectMembers.map(pm => pm.userId);
  const currentUserIds = await this.getUserIdsFromMemberIds(currentAssigneeIds);

  // Créer des notifications pour les nouveaux assignés
  const newAssignees = newUserIds.filter(
    userId => !currentUserIds.includes(userId)
  );
  
  if (newAssignees.length > 0) {
    try {
      await this.notificationsService.createTaskAssignmentNotification(
        newAssignees,  // Passer les userIds
        currentTask?.title || 'Tâche mise à jour',
        id
      );
    } catch (error) {
      console.error('Erreur lors de la création des notifications d\'assignation:', error);
    }
  }
}

    // Créer une notification si la tâche est marquée comme terminée
    if (statusChanged && (newStatusName.toLowerCase().includes('terminé') || 
                          newStatusName.toLowerCase().includes('completed') ||
                          newStatusName.toLowerCase().includes('done') ||
                          newStatusName.toLowerCase().includes('fini') ||
                          newStatusName.toLowerCase().includes('finished'))) {
      try {
        const assigneeIds = currentTask?.assignees.map(a => a.memberId) || [];
        await this.notificationsService.createTaskCompletedNotification(
          assigneeIds,
          currentTask?.title || 'Tâche',
          id
        );
      } catch (error) {
        console.error('Erreur lors de la création des notifications de tâche terminée:', error);
      }
    }

    return this.getTaskWithDetails(id);
  }

  private async getUserIdsFromMemberIds(memberIds: string[]): Promise<string[]> {
  if (memberIds.length === 0) return [];
  
  const projectMembers = await this.prisma.projectMember.findMany({
    where: { id: { in: memberIds } },
    select: { userId: true },
  });
  
  return projectMembers.map(pm => pm.userId);
}

  async remove(id: string) {
    await this.validateTaskExists(id);
    
    // Supprimer d'abord les assignations
    await this.prisma.assignee.deleteMany({
      where: { taskId: id },
    });

    // Puis supprimer la tâche
    return this.prisma.task.delete({
      where: { id },
    });
  }

  // ==================== MÉTHODES POUR LES COMMENTAIRES ====================

  // Méthode pour ajouter un commentaire avec notification
  async addTaskComment(taskId: string, commentContent: string, authorId: string) {
    // Vérifier que la tâche existe
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignees: { 
          select: { 
            memberId: true,
            member: {
              select: {
                id: true,
                user: {
                  select: {
                    id: true,
                    username: true
                  }
                }
              }
            }
          } 
        }
      }
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    // Vérifier que l'utilisateur existe
    const user = await this.prisma.user.findUnique({
      where: { id: authorId }
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${authorId} not found`);
    }

    // Ajouter le commentaire
    const comment = await this.prisma.comment.create({
      data: {
        content: commentContent,
        taskId: taskId,
        userId: authorId
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstname: true,
            lastname: true
          }
        }
      }
    });

    // Créer des notifications pour les assignés (exclure l'auteur)
    try {
      const assigneeIds = task.assignees
        .map(a => a.member.user.id)
        .filter(id => id !== authorId); // Exclure l'auteur

      if (assigneeIds.length > 0) {
        await this.notificationsService.createTaskCommentNotification(
          taskId,
          task.title,
          commentContent,
          authorId,
          assigneeIds
        );
      }
    } catch (error) {
      console.error('Erreur lors de la création des notifications de commentaire:', error);
      // Ne pas throw l'erreur pour ne pas bloquer la création du commentaire
    }

    return comment;
  }

  // Récupérer les commentaires d'une tâche
  async getTaskComments(taskId: string) {
    // Vérifier que la tâche existe
    const task = await this.prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    // Récupérer les commentaires avec les informations de l'auteur
    return this.prisma.comment.findMany({
      where: { taskId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstname: true,
            lastname: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // Mettre à jour un commentaire
  async updateComment(commentId: string, content: string, userId: string) {
    // Vérifier que le commentaire existe et appartient à l'utilisateur
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { user: true }
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    if (comment.userId !== userId) {
      throw new NotFoundException('You can only update your own comments');
    }

    // Mettre à jour le commentaire
    return this.prisma.comment.update({
      where: { id: commentId },
      data: { content },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstname: true,
            lastname: true
          }
        }
      }
    });
  }

  // Supprimer un commentaire
  async deleteComment(commentId: string, userId: string) {
    // Vérifier que le commentaire existe et appartient à l'utilisateur
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId }
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    if (comment.userId !== userId) {
      throw new NotFoundException('You can only delete your own comments');
    }

    // Supprimer le commentaire
    return this.prisma.comment.delete({
      where: { id: commentId }
    });
  }

  // Récupérer un commentaire spécifique
  async getComment(commentId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstname: true,
            lastname: true
          }
        },
        task: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    return comment;
  }

  // Nouvelles méthodes pour les données de référence
  async getTaskPriorities() {
    return this.prisma.taskPriority.findMany({
      orderBy: { order: 'asc' },
    });
  }

  async getTaskStatuses() {
    return this.prisma.taskStatus.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async getProjects() {
    return this.prisma.project.findMany({
      select: {
        id: true,
        name: true,
        description: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async getTimelines() {
    return this.prisma.timeline.findMany({
      select: {
        id: true,
        name: true,
        description: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async getMembers() {
    return this.prisma.projectMember.findMany({
      select: {
        id: true,
        isActive: true,
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      where: {
        isActive: true,
      },
      orderBy: {
        user: {
          username: 'asc',
        },
      },
    });
  }

  // ==================== TASK STATUS CRUD ====================

  async createTaskStatus(createTaskStatusDto: CreateTaskStatusDto) {
    // Vérifier que le nom n'existe pas déjà
    const existingStatus = await this.prisma.taskStatus.findUnique({
      where: { name: createTaskStatusDto.name }
    });

    if (existingStatus) {
      throw new ConflictException(`Task status with name "${createTaskStatusDto.name}" already exists`);
    }

    // Valider les relations
    if (createTaskStatusDto.projectId) {
      await this.validateProject(createTaskStatusDto.projectId);
    }
    if (createTaskStatusDto.timelineId) {
      await this.validateTimeline(createTaskStatusDto.timelineId);
    }

    const taskStatusData: Prisma.TaskStatusCreateInput = {
      name: createTaskStatusDto.name,
      description: createTaskStatusDto.description,
      color: createTaskStatusDto.color,
      order: createTaskStatusDto.order,
    };

    if (createTaskStatusDto.projectId) {
      taskStatusData.project = { connect: { id: createTaskStatusDto.projectId } };
    }

    if (createTaskStatusDto.timelineId) {
      taskStatusData.timeline = { connect: { id: createTaskStatusDto.timelineId } };
    }

    return this.prisma.taskStatus.create({
      data: taskStatusData,
      include: {
        project: { select: { id: true, name: true } },
        timeline: { select: { id: true, name: true } },
      },
    });
  }

  async findOneTaskStatus(id: string) {
    const taskStatus = await this.prisma.taskStatus.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        timeline: { select: { id: true, name: true } },
        tasks: { select: { id: true, title: true } },
      },
    });

    if (!taskStatus) {
      throw new NotFoundException(`Task status with ID ${id} not found`);
    }

    return taskStatus;
  }

  async updateTaskStatus(id: string, updateTaskStatusDto: UpdateTaskStatusDto) {
    await this.validateTaskStatusExists(id);

    // Si on change le nom, vérifier qu'il n'existe pas déjà
    if (updateTaskStatusDto.name) {
      const existingStatus = await this.prisma.taskStatus.findFirst({
        where: {
          name: updateTaskStatusDto.name,
          NOT: { id }
        }
      });

      if (existingStatus) {
        throw new ConflictException(`Task status with name "${updateTaskStatusDto.name}" already exists`);
      }
    }

    const updateData: Prisma.TaskStatusUpdateInput = {};

    if (updateTaskStatusDto.name !== undefined) updateData.name = updateTaskStatusDto.name;
    if (updateTaskStatusDto.description !== undefined) updateData.description = updateTaskStatusDto.description;
    if (updateTaskStatusDto.color !== undefined) updateData.color = updateTaskStatusDto.color;
    if (updateTaskStatusDto.order !== undefined) updateData.order = updateTaskStatusDto.order;

    if (updateTaskStatusDto.projectId !== undefined) {
      if (updateTaskStatusDto.projectId) {
        await this.validateProject(updateTaskStatusDto.projectId);
        updateData.project = { connect: { id: updateTaskStatusDto.projectId } };
      } else {
        updateData.project = { disconnect: true };
      }
    }

    if (updateTaskStatusDto.timelineId !== undefined) {
      if (updateTaskStatusDto.timelineId) {
        await this.validateTimeline(updateTaskStatusDto.timelineId);
        updateData.timeline = { connect: { id: updateTaskStatusDto.timelineId } };
      } else {
        updateData.timeline = { disconnect: true };
      }
    }

    return this.prisma.taskStatus.update({
      where: { id },
      data: updateData,
      include: {
        project: { select: { id: true, name: true } },
        timeline: { select: { id: true, name: true } },
      },
    });
  }

  async removeTaskStatus(id: string) {
    await this.validateTaskStatusExists(id);
    
    // Vérifier qu'aucune tâche n'utilise ce statut
    const tasksWithStatus = await this.prisma.task.count({
      where: { statusId: id }
    });

    if (tasksWithStatus > 0) {
      throw new ConflictException(`Cannot delete task status. ${tasksWithStatus} task(s) are using this status.`);
    }

    return this.prisma.taskStatus.delete({
      where: { id },
    });
  }

  // ==================== TIMELINE CRUD ====================

  async createTimeline(createTimelineDto: CreateTimelineDto) {
    // Valider que le projet existe
    await this.validateProject(createTimelineDto.projectId);

    return this.prisma.timeline.create({
      data: {
        name: createTimelineDto.name,
        description: createTimelineDto.description,
        project: { connect: { id: createTimelineDto.projectId } },
      },
      include: {
        project: { select: { id: true, name: true } },
      },
    });
  }

  async findOneTimeline(id: string) {
    const timeline = await this.prisma.timeline.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        tasks: { select: { id: true, title: true } },
        tasksStatuses: { select: { id: true, name: true } },
      },
    });

    if (!timeline) {
      throw new NotFoundException(`Timeline with ID ${id} not found`);
    }

    return timeline;
  }

  async updateTimeline(id: string, updateTimelineDto: UpdateTimelineDto) {
    await this.validateTimelineExists(id);

    const updateData: Prisma.TimelineUpdateInput = {};

    if (updateTimelineDto.name !== undefined) updateData.name = updateTimelineDto.name;
    if (updateTimelineDto.description !== undefined) updateData.description = updateTimelineDto.description;

    if (updateTimelineDto.projectId) {
      await this.validateProject(updateTimelineDto.projectId);
      updateData.project = { connect: { id: updateTimelineDto.projectId } };
    }

    return this.prisma.timeline.update({
      where: { id },
      data: updateData,
      include: {
        project: { select: { id: true, name: true } },
      },
    });
  }

  async removeTimeline(id: string) {
    await this.validateTimelineExists(id);
    
    // Vérifier qu'aucune tâche n'utilise cette timeline
    const tasksWithTimeline = await this.prisma.task.count({
      where: { timelineId: id }
    });

    if (tasksWithTimeline > 0) {
      throw new ConflictException(`Cannot delete timeline. ${tasksWithTimeline} task(s) are using this timeline.`);
    }

    // Vérifier qu'aucun statut n'utilise cette timeline
    const statusesWithTimeline = await this.prisma.taskStatus.count({
      where: { timelineId: id }
    });

    if (statusesWithTimeline > 0) {
      throw new ConflictException(`Cannot delete timeline. ${statusesWithTimeline} status(es) are using this timeline.`);
    }

    return this.prisma.timeline.delete({
      where: { id },
    });
  }

  // ==================== TASK PRIORITY CRUD ====================

  async createTaskPriority(createTaskPriorityDto: CreateTaskPriorityDto) {
    // Vérifier que le nom n'existe pas déjà
    const existingPriority = await this.prisma.taskPriority.findUnique({
      where: { name: createTaskPriorityDto.name }
    });

    if (existingPriority) {
      throw new ConflictException(`Task priority with name "${createTaskPriorityDto.name}" already exists`);
    }

    return this.prisma.taskPriority.create({
      data: {
        name: createTaskPriorityDto.name,
        description: createTaskPriorityDto.description,
        color: createTaskPriorityDto.color,
        order: createTaskPriorityDto.order,
      },
    });
  }

  async findOneTaskPriority(id: string) {
    const taskPriority = await this.prisma.taskPriority.findUnique({
      where: { id },
      include: {
        tasks: { select: { id: true, title: true } },
      },
    });

    if (!taskPriority) {
      throw new NotFoundException(`Task priority with ID ${id} not found`);
    }

    return taskPriority;
  }

  async updateTaskPriority(id: string, updateTaskPriorityDto: UpdateTaskPriorityDto) {
    await this.validateTaskPriorityExists(id);

    // Si on change le nom, vérifier qu'il n'existe pas déjà
    if (updateTaskPriorityDto.name) {
      const existingPriority = await this.prisma.taskPriority.findFirst({
        where: {
          name: updateTaskPriorityDto.name,
          NOT: { id }
        }
      });

      if (existingPriority) {
        throw new ConflictException(`Task priority with name "${updateTaskPriorityDto.name}" already exists`);
      }
    }

    const updateData: Prisma.TaskPriorityUpdateInput = {};

    if (updateTaskPriorityDto.name !== undefined) updateData.name = updateTaskPriorityDto.name;
    if (updateTaskPriorityDto.description !== undefined) updateData.description = updateTaskPriorityDto.description;
    if (updateTaskPriorityDto.color !== undefined) updateData.color = updateTaskPriorityDto.color;
    if (updateTaskPriorityDto.order !== undefined) updateData.order = updateTaskPriorityDto.order;

    return this.prisma.taskPriority.update({
      where: { id },
      data: updateData,
    });
  }

  async removeTaskPriority(id: string) {
    await this.validateTaskPriorityExists(id);
    
    // Vérifier qu'aucune tâche n'utilise cette priorité
    const tasksWithPriority = await this.prisma.task.count({
      where: { priorityId: id }
    });

    if (tasksWithPriority > 0) {
      throw new ConflictException(`Cannot delete task priority. ${tasksWithPriority} task(s) are using this priority.`);
    }

    return this.prisma.taskPriority.delete({
      where: { id },
    });
  }

  // ==================== MÉTHODES PRIVÉES/UTILITAIRES ====================

  private async validateTaskRelations(dto: CreateTaskDto | UpdateTaskDto) {
    const promises: Promise<{ type: string; result: any }>[] = [];

    if (dto.statusId) {
      promises.push(
        this.prisma.taskStatus.findUnique({ 
          where: { id: dto.statusId } 
        }).then(result => ({ type: 'status', result }))
      );
    }

    if (dto.priorityId) {
      promises.push(
        this.prisma.taskPriority.findUnique({ 
          where: { id: dto.priorityId } 
        }).then(result => ({ type: 'priority', result }))
      );
    }

    if (dto.projectId) {
      promises.push(
        this.prisma.project.findUnique({ 
          where: { id: dto.projectId } 
        }).then(result => ({ type: 'project', result }))
      );
    }

    if (dto.timelineId) {
      promises.push(
        this.prisma.timeline.findUnique({ 
          where: { id: dto.timelineId } 
        }).then(result => ({ type: 'timeline', result }))
      );
    }

    const results = await Promise.all(promises);

    for (const { type, result } of results) {
      if (!result) {
        throw new NotFoundException(`${type} not found`);
      }
    }
  }

  private async validateTaskExists(id: string) {
    const exists = await this.prisma.task.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
  }

  private async validateStatus(statusId: string) {
    const status = await this.prisma.taskStatus.findUnique({
      where: { id: statusId },
    });
    if (!status) {
      throw new NotFoundException('Task status not found');
    }
  }

  private async validatePriority(priorityId: string) {
    const priority = await this.prisma.taskPriority.findUnique({
      where: { id: priorityId },
    });
    if (!priority) {
      throw new NotFoundException('Task priority not found');
    }
  }

  private async validateTimeline(timelineId: string) {
    const timeline = await this.prisma.timeline.findUnique({
      where: { id: timelineId },
    });
    if (!timeline) {
      throw new NotFoundException('Timeline not found');
    }
  }

  private async validateMembers(memberIds: string[]) {
    if (memberIds.length === 0) return;

    const existingMembers = await this.prisma.projectMember.findMany({
      where: {
        id: { in: memberIds },
        isActive: true,
      },
      select: { id: true },
    });

    if (existingMembers.length !== memberIds.length) {
      throw new NotFoundException('One or more members not found or inactive');
    }
  }

  private async assignTaskMembers(taskId: string, memberIds: string[]) {
    // Valider que tous les membres existent
    await this.validateMembers(memberIds);

    await this.prisma.assignee.createMany({
      data: memberIds.map(memberId => ({
        taskId,
        memberId,
      })),
      skipDuplicates: true,
    });
  }

  private async syncTaskAssignees(taskId: string, memberIds: string[]) {
    // Supprimer toutes les assignations existantes
    await this.prisma.assignee.deleteMany({
      where: { taskId },
    });

    // Ajouter les nouvelles assignations si il y en a
    if (memberIds.length > 0) {
      await this.assignTaskMembers(taskId, memberIds);
    }
  }

  private getDefaultIncludes() {
    return {
      status: true,
      priority: true,
      project: { select: { id: true, name: true } },
      timeline: { select: { id: true, name: true } },
      assignees: {
        include: {
          member: {
            include: {
              user: { select: { id: true, username: true } },
            },
          },
        },
      },
    };
  }

  private getFullIncludes() {
    return {
      ...this.getDefaultIncludes(),
      parentTask: { select: { id: true, title: true } },
      subtasks: { select: { id: true, title: true } },
      dependencies: { select: { id: true, title: true } },
      dependents: { select: { id: true, title: true } },
      comments: {
        include: {
          user: { select: { id: true, username: true } },
        },
      },
      documents: true,
      taskReviews: {
        include: {
          reviewer: { select: { id: true, username: true } },
        },
      },
      createdBy: { 
        include: {
          user: { select: { id: true, username: true } }
        }
      },
    };
  }

  private async getTaskWithDetails(id: string) {
    return this.prisma.task.findUnique({
      where: { id },
      include: this.getFullIncludes(),
    });
  }

  // ==================== MÉTHODES DE VALIDATION SUPPLÉMENTAIRES ====================

  private async validateTaskStatusExists(id: string) {
    const exists = await this.prisma.taskStatus.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException(`Task status with ID ${id} not found`);
    }
  }

  private async validateTimelineExists(id: string) {
    const exists = await this.prisma.timeline.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException(`Timeline with ID ${id} not found`);
    }
  }

  private async validateTaskPriorityExists(id: string) {
    const exists = await this.prisma.taskPriority.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException(`Task priority with ID ${id} not found`);
    }
  }

  private async validateProject(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
  }
}