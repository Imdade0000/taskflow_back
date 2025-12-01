import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectFiltersDto } from './dto/project-filters.dto';
import { Prisma } from '@prisma/client';
import { NotificationsGateway } from '../notifications/notifications.gateway';

export enum ProjectRoleEnum {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

@Injectable()
export class ProjectService implements OnModuleInit {
  private readonly logger = new Logger(ProjectService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async onModuleInit() {
    await this.initializeDefaultProjectRoles();
  }

  private async initializeDefaultProjectRoles() {
    try {
      const requiredRoles = [
        {
          name: ProjectRoleEnum.OWNER,
          description: 'Propriétaire du projet avec tous les droits',
        },
        {
          name: ProjectRoleEnum.ADMIN,
          description: 'Administrateur du projet avec droits étendus',
        },
        {
          name: ProjectRoleEnum.MEMBER,
          description: 'Membre standard avec droits de base',
        },
      ];

      for (const role of requiredRoles) {
        await this.prisma.projectRole.upsert({
          where: { name: role.name },
          update: {},
          create: role,
        });
      }

      this.logger.log('Default project roles initialized');
    } catch (error) {
      this.logger.error('Failed to initialize default roles', error.stack);
      throw new Error('Could not initialize required project roles');
    }
  }

  async create(createProjectDto: CreateProjectDto) {
  try {
    await this.validateProjectRelations(createProjectDto);
    
    // Convertir les dates au format ISO avec gestion appropriée des valeurs nulles
    const projectData = {
      ...createProjectDto,
      startDate: new Date(createProjectDto.startDate).toISOString(),
      dueStart: createProjectDto.dueStart ? new Date(createProjectDto.dueStart).toISOString() : undefined as any,
      endDate: createProjectDto.endDate ? new Date(createProjectDto.endDate).toISOString() : undefined as any,
      dueEnd: createProjectDto.dueEnd ? new Date(createProjectDto.dueEnd).toISOString() : undefined as any,
    };

    const project = await this.prisma.$transaction(async (prisma) => {
      const newProject = await prisma.project.create({
        data: {
          name: projectData.name,
          description: projectData.description,
          startDate: projectData.startDate,
          dueStart: projectData.dueStart,
          endDate: projectData.endDate,
          dueEnd: projectData.dueEnd,
          status: { connect: { id: projectData.projectStatusId } },
        },
      });
      
      await this.addProjectMember(
        prisma,
        newProject.id,
        projectData.userId,
        ProjectRoleEnum.OWNER,
      );
      
      return newProject;
    });

    await this.notifyProjectUpdate(project.id, 'Project created');
    return this.getProjectWithDetails(project.id);
  } catch (error) {
    this.logger.error(`Project creation failed: ${error.message}`, error.stack);
    throw this.handleProjectError(error);
  }
}

  async findAll(filters: ProjectFiltersDto) {
    try {
      const where: Prisma.ProjectWhereInput = this.buildProjectWhereClause(filters);
      return await this.prisma.project.findMany({
        where,
        include: this.getDefaultIncludes(),
      });
    } catch (error) {
      this.logger.error(`Failed to fetch projects: ${error.message}`);
      throw this.handleProjectError(error);
    }
  }

  async findOne(id: string) {
    try {
      const project = await this.getProjectWithDetails(id);
      if (!project) {
        throw new NotFoundException(`Project with ID ${id} not found`);
      }
      return project;
    } catch (error) {
      this.logger.error(`Failed to fetch project ${id}: ${error.message}`);
      throw this.handleProjectError(error);
    }
  }

  async update(id: string, updateProjectDto: UpdateProjectDto) {
    try {
      await this.validateProjectExists(id);

      if (updateProjectDto.projectStatusId) {
        await this.validateStatus(updateProjectDto.projectStatusId);
      }

      // Convertir les dates au format ISO
      const updateData = this.buildProjectUpdateData(updateProjectDto);
      if (updateProjectDto.startDate) {
        updateData.startDate = new Date(updateProjectDto.startDate).toISOString();
      }
      if (updateProjectDto.dueStart) {
        updateData.dueStart = new Date(updateProjectDto.dueStart).toISOString();
      }
      if (updateProjectDto.endDate) {
        updateData.endDate = new Date(updateProjectDto.endDate).toISOString();
      }
      if (updateProjectDto.dueEnd) {
        updateData.dueEnd = new Date(updateProjectDto.dueEnd).toISOString();
      }

      const updatedProject = await this.prisma.project.update({
        where: { id },
        data: updateData,
      });

      await this.notifyProjectUpdate(id, 'Project updated');
      return this.getProjectWithDetails(id);
    } catch (error) {
      this.logger.error(`Failed to update project ${id}: ${error.message}`);
      throw this.handleProjectError(error);
    }
  }

  async remove(id: string) {
    try {
      await this.validateProjectExists(id);

      // Supprimer d'abord les relations dépendantes
      await this.prisma.$transaction([
        this.prisma.task.deleteMany({ where: { projectId: id } }),
        this.prisma.projectMember.deleteMany({ where: { projectId: id } }),
        //this.prisma.projectDocument.deleteMany({ where: { projectId: id } }),
        this.prisma.projectTag.deleteMany({ where: { projectId: id } }),
        this.prisma.timeline.deleteMany({ where: { projectId: id } }),
      ]);

      // Puis supprimer le projet
      const deletedProject = await this.prisma.project.delete({
        where: { id },
      });

      await this.notificationsGateway.sendNotificationToUsers(
        await this.getProjectMemberIds(id),
        { type: 'PROJECT_DELETED', projectId: id },
      );

      return deletedProject;
    } catch (error) {
      this.logger.error(`Failed to delete project ${id}: ${error.message}`);
      throw this.handleProjectError(error);
    }
  }

  async archive(id: string) {
    try {
      await this.validateProjectExists(id);
      
      return await this.prisma.project.update({
        where: { id },
        data: {
          isArchived: true,
          archivedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      this.logger.error(`Failed to archive project ${id}: ${error.message}`);
      throw this.handleProjectError(error);
    }
  }

  async restore(id: string) {
    try {
      await this.validateProjectExists(id);
      
      return await this.prisma.project.update({
        where: { id },
        data: {
          isArchived: false,
          archivedAt: null
        }
      });
    } catch (error) {
      this.logger.error(`Failed to restore project ${id}: ${error.message}`);
      throw this.handleProjectError(error);
    }
  }

  private async notifyProjectUpdate(projectId: string, content: string) {
    const memberIds = await this.getProjectMemberIds(projectId);
    this.notificationsGateway.sendNotificationToUsers(
      memberIds,
      { 
        type: 'PROJECT_UPDATE',
        projectId,
        content,
        timestamp: new Date().toISOString() 
      }
    );
  }

  private async getProjectWithDetails(id: string) {
    return this.prisma.project.findUnique({
      where: { id },
      include: this.getFullIncludes(),
    });
  }

  private async validateProjectExists(id: string) {
    const exists = await this.prisma.project.count({ 
      where: { id }
    });
    if (exists === 0) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
  }

  private async validateStatus(statusId: string) {
    const statusExists = await this.prisma.projectStatus.count({
      where: { id: statusId }
    });
    if (statusExists === 0) {
      throw new NotFoundException('Project status not found');
    }
  }

  private async getProjectMemberIds(projectId: string): Promise<string[]> {
    const members = await this.prisma.projectMember.findMany({
      where: { projectId },
      select: { userId: true }
    });
    return members.map(m => m.userId);
  }

  private async addProjectMember(
    prisma: Prisma.TransactionClient,
    projectId: string,
    userId: string,
    roleType: ProjectRoleEnum,
  ) {
    const role = await prisma.projectRole.findUnique({
      where: { name: roleType },
    });

    if (!role) {
      throw new BadRequestException(
        `Required role ${roleType} not found in database`,
      );
    }

    return prisma.projectMember.create({
      data: {
        userId,
        projectId,
        projectRoleId: role.id,
        isActive: true,
      },
    });
  }

  private buildProjectWhereClause(filters: ProjectFiltersDto): Prisma.ProjectWhereInput {
    const where: Prisma.ProjectWhereInput = {
      isArchived: filters.isArchived,
      projectStatusId: filters.statusId,
    };

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }

    return where;
  }

  private buildProjectUpdateData(
    updateProjectDto: UpdateProjectDto,
  ): Prisma.ProjectUpdateInput {
    return {
      name: updateProjectDto.name,
      description: updateProjectDto.description,
      ...(updateProjectDto.startDate && { startDate: updateProjectDto.startDate }),
      ...(updateProjectDto.dueStart && { dueStart: updateProjectDto.dueStart }),
      ...(updateProjectDto.endDate && { endDate: updateProjectDto.endDate }),
      ...(updateProjectDto.dueEnd && { dueEnd: updateProjectDto.dueEnd }),
      ...(updateProjectDto.projectStatusId && {
        status: { connect: { id: updateProjectDto.projectStatusId } },
      }),
    };
  }

  private handleProjectError(error: Error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          return new ConflictException('Unique constraint violation');
        case 'P2025':
          return new NotFoundException('Record not found');
        case 'P2003':
          return new BadRequestException('Cannot delete project with existing dependencies');
        default:
          this.logger.error(`Prisma error: ${error.code}`, error.stack);
          return new BadRequestException('Database operation failed');
      }
    }
    return error;
  }

  private async validateProjectRelations(createProjectDto: CreateProjectDto) {
    try {
      const userExists = await this.prisma.user.count({
        where: { id: createProjectDto.userId },
      });
      if (userExists === 0) {
        throw new BadRequestException('Specified user does not exist');
      }

      const statusExists = await this.prisma.projectStatus.count({
        where: { id: createProjectDto.projectStatusId },
      });
      if (statusExists === 0) {
        throw new BadRequestException('Specified project status does not exist');
      }
    } catch (error) {
      this.logger.error('Validation failed', error.stack);
      throw error;
    }
  }

  private getDefaultIncludes(): Prisma.ProjectInclude {
    return {
      status: true,
      members: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          projectRole: true,
        },
      },
    };
  }

  private getFullIncludes(): Prisma.ProjectInclude {
    return {
      ...this.getDefaultIncludes(),
      tasks: {
        include: {
          assignees: {
            include: {
              member: {
                include: {
                  user: {
                    select: {
                      id: true,
                      username: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      timelines: true,
      tags: {
        include: {
          tag: true,
        },
      },
      documents: true,
    };
  }
}