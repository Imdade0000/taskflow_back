import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectPermissionDto } from './dto/create-project-permission.dto';
import { UpdateProjectPermissionDto } from './dto/update-project-permission.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProjectPermissionService {
  private readonly logger = new Logger(ProjectPermissionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    try {
      return await this.prisma.projectPermission.findMany({
        where: {
          deletedAt: null,
        },
        include: {
          projectsRolePermissions: {
            where: {
              deletedAt: null,
            },
            include: {
              projectRole: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          _count: {
            select: {
              projectsRolePermissions: {
                where: {
                  deletedAt: null,
                },
              },
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });
    } catch (error) {
      this.logger.error(`Failed to fetch project permissions: ${error.message}`);
      throw this.handleError(error);
    }
  }

  async findById(id: string) {
    try {
      const projectPermission = await this.prisma.projectPermission.findUnique({
        where: { id },
        include: {
          projectsRolePermissions: {
            where: {
              deletedAt: null,
            },
            include: {
              projectRole: true,
            },
          },
        },
      });

      if (!projectPermission) {
        throw new NotFoundException(`Project permission with ID ${id} not found`);
      }

      return projectPermission;
    } catch (error) {
      this.logger.error(`Failed to fetch project permission ${id}: ${error.message}`);
      throw this.handleError(error);
    }
  }

  async findBySlug(slug: string) {
    try {
      const projectPermission = await this.prisma.projectPermission.findUnique({
        where: { slug },
        include: {
          projectsRolePermissions: {
            where: {
              deletedAt: null,
            },
            include: {
              projectRole: true,
            },
          },
        },
      });

      if (!projectPermission) {
        throw new NotFoundException(`Project permission with slug "${slug}" not found`);
      }

      return projectPermission;
    } catch (error) {
      this.logger.error(`Failed to fetch project permission by slug ${slug}: ${error.message}`);
      throw this.handleError(error);
    }
  }

  async create(createProjectPermissionDto: CreateProjectPermissionDto) {
    try {
      // Vérifier l'unicité du slug
      const existingPermission = await this.prisma.projectPermission.findFirst({
        where: {
          OR: [
            { name: createProjectPermissionDto.name },
            { slug: createProjectPermissionDto.slug },
          ],
          deletedAt: null,
        },
      });

      if (existingPermission) {
        if (existingPermission.name === createProjectPermissionDto.name) {
          throw new ConflictException(`Project permission with name "${createProjectPermissionDto.name}" already exists`);
        }
        if (existingPermission.slug === createProjectPermissionDto.slug) {
          throw new ConflictException(`Project permission with slug "${createProjectPermissionDto.slug}" already exists`);
        }
      }

      const projectPermission = await this.prisma.projectPermission.create({
        data: createProjectPermissionDto,
        include: {
          projectsRolePermissions: {
            include: {
              projectRole: true,
            },
          },
        },
      });

      this.logger.log(`Project permission created: ${projectPermission.name} (${projectPermission.slug})`);
      return projectPermission;
    } catch (error) {
      this.logger.error(`Failed to create project permission: ${error.message}`);
      throw this.handleError(error);
    }
  }

  async update(id: string, updateProjectPermissionDto: UpdateProjectPermissionDto) {
    try {
      await this.validateProjectPermissionExists(id);

      // Vérifier l'unicité si des champs uniques sont modifiés
      if (updateProjectPermissionDto.name || updateProjectPermissionDto.slug) {
        // Typage explicite pour éviter l'erreur TypeScript
        const conflictConditions: Array<{ name?: string; slug?: string }> = [];
        
        if (updateProjectPermissionDto.name) {
          conflictConditions.push({ name: updateProjectPermissionDto.name });
        }
        if (updateProjectPermissionDto.slug) {
          conflictConditions.push({ slug: updateProjectPermissionDto.slug });
        }

        const existingPermission = await this.prisma.projectPermission.findFirst({
          where: {
            OR: conflictConditions,
            deletedAt: null,
            NOT: { id },
          },
        });

        if (existingPermission) {
          if (existingPermission.name === updateProjectPermissionDto.name) {
            throw new ConflictException(`Project permission with name "${updateProjectPermissionDto.name}" already exists`);
          }
          if (existingPermission.slug === updateProjectPermissionDto.slug) {
            throw new ConflictException(`Project permission with slug "${updateProjectPermissionDto.slug}" already exists`);
          }
        }
      }

      const updatedPermission = await this.prisma.projectPermission.update({
        where: { id },
        data: updateProjectPermissionDto,
        include: {
          projectsRolePermissions: {
            where: {
              deletedAt: null,
            },
            include: {
              projectRole: true,
            },
          },
        },
      });

      this.logger.log(`Project permission updated: ${updatedPermission.name} (${updatedPermission.id})`);
      return updatedPermission;
    } catch (error) {
      this.logger.error(`Failed to update project permission ${id}: ${error.message}`);
      throw this.handleError(error);
    }
  }

  async delete(id: string) {
    try {
      await this.validateProjectPermissionExists(id);

      // Vérifier s'il y a des associations actives avec des rôles
      const activeAssociations = await this.prisma.projectRolePermission.count({
        where: {
          projectPermissionId: id,
          deletedAt: null,
        },
      });

      if (activeAssociations > 0) {
        throw new BadRequestException(
          `Cannot delete project permission: it is currently assigned to ${activeAssociations} role(s)`
        );
      }

      const deletedPermission = await this.prisma.projectPermission.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      });

      this.logger.log(`Project permission deleted: ${deletedPermission.name} (${deletedPermission.id})`);
      return deletedPermission;
    } catch (error) {
      this.logger.error(`Failed to delete project permission ${id}: ${error.message}`);
      throw this.handleError(error);
    }
  }

  async getUserProjectPermissions(userId: string, projectId: string) {
    try {
      // Vérifier que l'utilisateur est membre du projet
      const projectMember = await this.prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId,
            projectId,
          },
          isActive: true,
          deletedAt: null,
        },
        include: {
          projectRole: {
            include: {
              projectsRolePermissions: {
                where: {
                  deletedAt: null,
                },
                include: {
                  projectPermission: true,
                },
              },
            },
          },
        },
      });

      if (!projectMember) {
        throw new NotFoundException(`User is not a member of the specified project or membership is not active`);
      }

      // Extraire les permissions du rôle de projet
      const permissions = projectMember.projectRole.projectsRolePermissions.map(
        rp => rp.projectPermission
      );

      return {
        userId,
        projectId,
        projectRole: {
          id: projectMember.projectRole.id,
          name: projectMember.projectRole.name,
        },
        permissions,
      };
    } catch (error) {
      this.logger.error(`Failed to get user project permissions: ${error.message}`);
      throw this.handleError(error);
    }
  }

  async checkUserHasProjectPermission(
    userId: string, 
    projectId: string, 
    permissionSlug: string
  ): Promise<boolean> {
    try {
      const projectMember = await this.prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId,
            projectId,
          },
          isActive: true,
          deletedAt: null,
        },
        include: {
          projectRole: {
            include: {
              projectsRolePermissions: {
                where: {
                  deletedAt: null,
                },
                include: {
                  projectPermission: true,
                },
              },
            },
          },
        },
      });

      if (!projectMember) {
        return false;
      }

      // Vérifier si l'utilisateur a la permission spécifique
      const hasPermission = projectMember.projectRole.projectsRolePermissions.some(
        rp => rp.projectPermission.slug === permissionSlug
      );

      return hasPermission;
    } catch (error) {
      this.logger.error(`Failed to check user project permission: ${error.message}`);
      return false;
    }
  }

  async seedDefaultPermissions() {
    try {
      // Typage explicite des permissions par défaut
      const defaultPermissions: Array<{
        slug: string;
        name: string;
        description: string;
      }> = [
        // Permissions de gestion de projet
        { 
          slug: 'project.view', 
          name: 'Voir le projet', 
          description: 'Permission de consulter les détails du projet' 
        },
        { 
          slug: 'project.edit', 
          name: 'Modifier le projet', 
          description: 'Permission de modifier les informations du projet' 
        },
        { 
          slug: 'project.delete', 
          name: 'Supprimer le projet', 
          description: 'Permission de supprimer le projet' 
        },
        { 
          slug: 'project.archive', 
          name: 'Archiver le projet', 
          description: 'Permission d\'archiver/restaurer le projet' 
        },
        
        // Permissions de gestion des membres
        { 
          slug: 'project.members.view', 
          name: 'Voir les membres', 
          description: 'Permission de consulter la liste des membres du projet' 
        },
        { 
          slug: 'project.members.add', 
          name: 'Ajouter des membres', 
          description: 'Permission d\'ajouter de nouveaux membres au projet' 
        },
        { 
          slug: 'project.members.remove', 
          name: 'Supprimer des membres', 
          description: 'Permission de retirer des membres du projet' 
        },
        { 
          slug: 'project.members.manage_roles', 
          name: 'Gérer les rôles des membres', 
          description: 'Permission de modifier les rôles des membres du projet' 
        },
        
        // Permissions de gestion des tâches
        { 
          slug: 'project.tasks.view', 
          name: 'Voir les tâches', 
          description: 'Permission de consulter les tâches du projet' 
        },
        { 
          slug: 'project.tasks.create', 
          name: 'Créer des tâches', 
          description: 'Permission de créer de nouvelles tâches' 
        },
        { 
          slug: 'project.tasks.edit', 
          name: 'Modifier les tâches', 
          description: 'Permission de modifier les tâches existantes' 
        },
        { 
          slug: 'project.tasks.delete', 
          name: 'Supprimer des tâches', 
          description: 'Permission de supprimer des tâches' 
        },
        { 
          slug: 'project.tasks.assign', 
          name: 'Assigner des tâches', 
          description: 'Permission d\'assigner des tâches à des membres' 
        },
        
        // Permissions de gestion des documents
        { 
          slug: 'project.documents.view', 
          name: 'Voir les documents', 
          description: 'Permission de consulter les documents du projet' 
        },
        { 
          slug: 'project.documents.upload', 
          name: 'Télécharger des documents', 
          description: 'Permission de télécharger de nouveaux documents' 
        },
        { 
          slug: 'project.documents.delete', 
          name: 'Supprimer des documents', 
          description: 'Permission de supprimer des documents' 
        },
        
        // Permissions de gestion des commentaires
        { 
          slug: 'project.comments.view', 
          name: 'Voir les commentaires', 
          description: 'Permission de consulter les commentaires du projet' 
        },
        { 
          slug: 'project.comments.create', 
          name: 'Créer des commentaires', 
          description: 'Permission d\'ajouter des commentaires' 
        },
        { 
          slug: 'project.comments.edit', 
          name: 'Modifier les commentaires', 
          description: 'Permission de modifier ses propres commentaires' 
        },
        { 
          slug: 'project.comments.delete', 
          name: 'Supprimer des commentaires', 
          description: 'Permission de supprimer des commentaires' 
        },
      ];

      // Typage explicite du tableau de résultats
      const createdPermissions: Array<{
        id: string;
        name: string;
        slug: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
      }> = [];
      
      for (const permission of defaultPermissions) {
        const created = await this.prisma.projectPermission.upsert({
          where: { slug: permission.slug },
          create: permission,
          update: permission,
        });
        createdPermissions.push(created);
      }

      this.logger.log(`${createdPermissions.length} default project permissions initialized`);
      return {
        message: 'Default project permissions created successfully',
        count: createdPermissions.length,
        permissions: createdPermissions,
      };
    } catch (error) {
      this.logger.error(`Failed to seed default project permissions: ${error.message}`);
      throw this.handleError(error);
    }
  }

  // Méthodes utilitaires privées
  private async validateProjectPermissionExists(id: string) {
    const exists = await this.prisma.projectPermission.count({
      where: { id, deletedAt: null },
    });
    if (exists === 0) {
      throw new NotFoundException(`Project permission with ID ${id} not found`);
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