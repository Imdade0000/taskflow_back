import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectMemberDto } from './dto/create-project-member.dto';
import { UpdateProjectMemberRoleDto } from './dto/update-project-member-role.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProjectMemberService {
  private readonly logger = new Logger(ProjectMemberService.name);

  constructor(private readonly prisma: PrismaService) {}

  async addMember(projectId: string, dto: CreateProjectMemberDto) {
    try {
      // Vérifier que le projet existe
      await this.validateProjectExists(projectId);
      
      // Vérifier que l'utilisateur existe
      await this.validateUserExists(dto.userId);
      
      // Vérifier que le rôle existe
      await this.validateProjectRoleExists(dto.projectRoleId);

      // Vérifier que l'utilisateur n'est pas déjà membre
      const existingMember = await this.prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId: dto.userId,
            projectId,
          },
        },
      });

      if (existingMember) {
        if (existingMember.deletedAt === null) {
          throw new ConflictException('User is already a member of this project');
        }
        
        // Restaurer le membre supprimé
        return await this.prisma.projectMember.update({
          where: { id: existingMember.id },
          data: {
            projectRoleId: dto.projectRoleId,
            isActive: true,
            deletedAt: null,
          },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
            projectRole: true,
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });
      }

      // Créer le nouveau membre
      const newMember = await this.prisma.projectMember.create({
        data: {
          projectId,
          userId: dto.userId,
          projectRoleId: dto.projectRoleId,
          isActive: true,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          projectRole: true,
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      this.logger.log(`Member added to project: User ${dto.userId} -> Project ${projectId}`);
      return newMember;
    } catch (error) {
      this.logger.error(`Failed to add member to project: ${error.message}`);
      throw this.handleError(error);
    }
  }

  async listMembers(projectId: string) {
    try {
      await this.validateProjectExists(projectId);

      return await this.prisma.projectMember.findMany({
        where: {
          projectId,
          deletedAt: null,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              createdAt: true,
            },
          },
          projectRole: {
            include: {
              projectsRolePermissions: {
                where: { deletedAt: null },
                include: {
                  projectPermission: true,
                },
              },
            },
          },
        },
        orderBy: [
          { isActive: 'desc' },
          { createdAt: 'asc' },
        ],
      });
    } catch (error) {
      this.logger.error(`Failed to list project members: ${error.message}`);
      throw this.handleError(error);
    }
  }

  async getMember(projectId: string, userId: string) {
    try {
      await this.validateProjectExists(projectId);

      const member = await this.prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId,
            projectId,
          },
          deletedAt: null,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              createdAt: true,
            },
          },
          projectRole: {
            include: {
              projectsRolePermissions: {
                where: { deletedAt: null },
                include: {
                  projectPermission: true,
                },
              },
            },
          },
          project: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
          assignedTasks: {
            include: {
              task: {
                select: {
                  id: true,
                  title: true,
                  status: true,
                },
              },
            },
          },
        },
      });

      if (!member) {
        throw new NotFoundException('Member not found in this project');
      }

      return member;
    } catch (error) {
      this.logger.error(`Failed to get project member: ${error.message}`);
      throw this.handleError(error);
    }
  }

  async updateMemberRole(projectId: string, userId: string, dto: UpdateProjectMemberRoleDto) {
    try {
      await this.validateProjectExists(projectId);
      await this.validateProjectRoleExists(dto.projectRoleId);

      const member = await this.prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId,
            projectId,
          },
          deletedAt: null,
        },
      });

      if (!member) {
        throw new NotFoundException('Member not found in this project');
      }

      const updatedMember = await this.prisma.projectMember.update({
        where: { id: member.id },
        data: {
          projectRoleId: dto.projectRoleId,
        },
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
      });

      this.logger.log(`Member role updated: User ${userId} in Project ${projectId}`);
      return updatedMember;
    } catch (error) {
      this.logger.error(`Failed to update member role: ${error.message}`);
      throw this.handleError(error);
    }
  }

  async toggleMemberStatus(projectId: string, userId: string, isActive: boolean) {
    try {
      await this.validateProjectExists(projectId);

      const member = await this.prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId,
            projectId,
          },
          deletedAt: null,
        },
      });

      if (!member) {
        throw new NotFoundException('Member not found in this project');
      }

      const updatedMember = await this.prisma.projectMember.update({
        where: { id: member.id },
        data: { isActive },
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
      });

      this.logger.log(`Member status updated: User ${userId} -> ${isActive ? 'Active' : 'Inactive'} in Project ${projectId}`);
      return updatedMember;
    } catch (error) {
      this.logger.error(`Failed to toggle member status: ${error.message}`);
      throw this.handleError(error);
    }
  }

  async removeMember(projectId: string, userId: string) {
    try {
      await this.validateProjectExists(projectId);

      const member = await this.prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId,
            projectId,
          },
        },
      });

      if (!member) {
        throw new NotFoundException('Member not found in this project');
      }

      // Vérifier si le membre a des tâches assignées actives
      const activeTasks = await this.prisma.assignee.count({
        where: {
          memberId: member.id,
          task: {
            deletedAt: null,
          },
        },
      });

      if (activeTasks > 0) {
        throw new BadRequestException(
          `Cannot remove member: they have ${activeTasks} assigned task(s). Please reassign tasks first.`
        );
      }

      // Supprimer logiquement le membre
      const removedMember = await this.prisma.projectMember.update({
        where: { id: member.id },
        data: {
          deletedAt: new Date(),
          isActive: false,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      });

      this.logger.log(`Member removed from project: User ${userId} <- Project ${projectId}`);
      return {
        message: 'Member removed successfully',
        removedMember,
      };
    } catch (error) {
      this.logger.error(`Failed to remove member from project: ${error.message}`);
      throw this.handleError(error);
    }
  }

  async getMemberPermissions(projectId: string, userId: string) {
    try {
      await this.validateProjectExists(projectId);

      const member = await this.prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId,
            projectId,
          },
          deletedAt: null,
          isActive: true,
        },
        include: {
          projectRole: {
            include: {
              projectsRolePermissions: {
                where: { deletedAt: null },
                include: {
                  projectPermission: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      });

      if (!member) {
        throw new NotFoundException('Active member not found in this project');
      }

      const permissions = member.projectRole.projectsRolePermissions.map(
        rp => rp.projectPermission
      );

      return {
        userId,
        projectId,
        user: member.user,
        projectRole: {
          id: member.projectRole.id,
          name: member.projectRole.name,
          description: member.projectRole.description,
        },
        permissions,
        permissionSlugs: permissions.map(p => p.slug),
      };
    } catch (error) {
      this.logger.error(`Failed to get member permissions: ${error.message}`);
      throw this.handleError(error);
    }
  }

  // Méthodes utilitaires privées
  private async validateProjectExists(projectId: string) {
    const exists = await this.prisma.project.count({
      where: { id: projectId, deletedAt: null },
    });
    if (exists === 0) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }
  }

  private async validateUserExists(userId: string) {
    const exists = await this.prisma.user.count({
      where: { id: userId, deletedAt: null },
    });
    if (exists === 0) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
  }

  private async validateProjectRoleExists(roleId: string) {
    const exists = await this.prisma.projectRole.count({
      where: { id: roleId, deletedAt: null },
    });
    if (exists === 0) {
      throw new NotFoundException(`Project role with ID ${roleId} not found`);
    }
  }

  private handleError(error: Error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          return new ConflictException('Unique constraint violation');
        case 'P2025':
          return new NotFoundException('Record not found');
        case 'P2003':
          return new BadRequestException('Foreign key constraint failed');
        default:
          this.logger.error(`Prisma error: ${error.code}`, error.stack);
          return new BadRequestException('Database operation failed');
      }
    }
    return error;
  }
}