import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectRoleDto } from './dto/create-project-role.dto';
import { UpdateProjectRoleDto } from './dto/update-project-role.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProjectRoleService {
  private readonly logger = new Logger(ProjectRoleService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    try {
      return await this.prisma.projectRole.findMany({
        where: {
          deletedAt: null,
        },
        include: {
          projectsRolePermissions: {
            where: {
              deletedAt: null,
            },
            include: {
              projectPermission: true,
            },
          },
          _count: {
            select: {
              members: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });
    } catch (error) {
      this.logger.error(`Failed to fetch project roles: ${error.message}`);
      throw this.handleError(error);
    }
  }

  async findById(id: string) {
    try {
      const projectRole = await this.prisma.projectRole.findUnique({
        where: { id },
        include: {
          projectsRolePermissions: {
            where: {
              deletedAt: null,
            },
            include: {
              projectPermission: true,
            },
          },
          members: {
            include: {
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
          },
        },
      });

      if (!projectRole) {
        throw new NotFoundException(`Project role with ID ${id} not found`);
      }

      return projectRole;
    } catch (error) {
      this.logger.error(`Failed to fetch project role ${id}: ${error.message}`);
      throw this.handleError(error);
    }
  }

  async findByName(name: string) {
    try {
      const projectRole = await this.prisma.projectRole.findFirst({
        where: {
          name,
          deletedAt: null,
        },
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
      });

      if (!projectRole) {
        throw new NotFoundException(`Project role with name "${name}" not found`);
      }

      return projectRole;
    } catch (error) {
      this.logger.error(`Failed to fetch project role by name ${name}: ${error.message}`);
      throw this.handleError(error);
    }
  }

  async create(createProjectRoleDto: CreateProjectRoleDto) {
    try {
      // Vérifier si un rôle avec ce nom existe déjà
      const existingRole = await this.prisma.projectRole.findFirst({
        where: {
          name: createProjectRoleDto.name,
          deletedAt: null,
        },
      });

      if (existingRole) {
        throw new ConflictException(`Project role with name "${createProjectRoleDto.name}" already exists`);
      }

      const projectRole = await this.prisma.projectRole.create({
        data: createProjectRoleDto,
        include: {
          projectsRolePermissions: {
            include: {
              projectPermission: true,
            },
          },
        },
      });

      this.logger.log(`Project role created: ${projectRole.name} (${projectRole.id})`);
      return projectRole;
    } catch (error) {
      this.logger.error(`Failed to create project role: ${error.message}`);
      throw this.handleError(error);
    }
  }

  async update(id: string, updateProjectRoleDto: UpdateProjectRoleDto) {
    try {
      await this.validateProjectRoleExists(id);

      // Vérifier l'unicité du nom si fourni
      if (updateProjectRoleDto.name) {
        const existingRole = await this.prisma.projectRole.findFirst({
          where: {
            name: updateProjectRoleDto.name,
            deletedAt: null,
            NOT: { id },
          },
        });

        if (existingRole) {
          throw new ConflictException(`Project role with name "${updateProjectRoleDto.name}" already exists`);
        }
      }

      const updatedRole = await this.prisma.projectRole.update({
        where: { id },
        data: updateProjectRoleDto,
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
      });

      this.logger.log(`Project role updated: ${updatedRole.name} (${updatedRole.id})`);
      return updatedRole;
    } catch (error) {
      this.logger.error(`Failed to update project role ${id}: ${error.message}`);
      throw this.handleError(error);
    }
  }

  async delete(id: string) {
    try {
      await this.validateProjectRoleExists(id);

      // Vérifier s'il y a des membres utilisant ce rôle
      const membersCount = await this.prisma.projectMember.count({
        where: {
          projectRoleId: id,
          deletedAt: null,
        },
      });

      if (membersCount > 0) {
        throw new BadRequestException(
          `Cannot delete project role: it is currently assigned to ${membersCount} member(s)`
        );
      }

      const deletedRole = await this.prisma.projectRole.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      });

      this.logger.log(`Project role deleted: ${deletedRole.name} (${deletedRole.id})`);
      return deletedRole;
    } catch (error) {
      this.logger.error(`Failed to delete project role ${id}: ${error.message}`);
      throw this.handleError(error);
    }
  }

  // Gestion des permissions pour les rôles de projet
  async addPermissionToRole(roleId: string, permissionId: string) {
    try {
      await this.validateProjectRoleExists(roleId);
      await this.validateProjectPermissionExists(permissionId);

      const existingAssociation = await this.prisma.projectRolePermission.findFirst({
        where: {
          projectRoleId: roleId,
          projectPermissionId: permissionId,
        },
      });

      if (existingAssociation) {
        if (existingAssociation.deletedAt) {
          // Restaurer l'association supprimée
          return await this.prisma.projectRolePermission.update({
            where: { id: existingAssociation.id },
            data: { deletedAt: null },
            include: {
              projectPermission: true,
            },
          });
        }
        return existingAssociation;
      }

      const newAssociation = await this.prisma.projectRolePermission.create({
        data: {
          projectRoleId: roleId,
          projectPermissionId: permissionId,
        },
        include: {
          projectPermission: true,
        },
      });

      this.logger.log(`Permission added to project role: ${permissionId} -> ${roleId}`);
      return newAssociation;
    } catch (error) {
      this.logger.error(`Failed to add permission to project role: ${error.message}`);
      throw this.handleError(error);
    }
  }

  async addPermissionsToRole(roleId: string, permissionIds: string[]) {
    try {
      if (permissionIds.length === 0) {
        return [];
      }

      await this.validateProjectRoleExists(roleId);
      
      // Valider toutes les permissions
      for (const permissionId of permissionIds) {
        await this.validateProjectPermissionExists(permissionId);
      }

      const existingAssociations = await this.prisma.projectRolePermission.findMany({
        where: {
          projectRoleId: roleId,
          projectPermissionId: {
            in: permissionIds,
          },
        },
      });

      // Restaurer les associations supprimées
      const toRestore = existingAssociations.filter(a => a.deletedAt !== null);
      if (toRestore.length > 0) {
        await this.prisma.projectRolePermission.updateMany({
          where: {
            id: {
              in: toRestore.map(a => a.id),
            },
          },
          data: {
            deletedAt: null,
          },
        });
      }

      // Créer les nouvelles associations
      const existingPermissionIds = existingAssociations.map(a => a.projectPermissionId);
      const permissionsToCreate = permissionIds
        .filter(id => !existingPermissionIds.includes(id))
        .map(permissionId => ({
          projectRoleId: roleId,
          projectPermissionId: permissionId,
        }));

      if (permissionsToCreate.length > 0) {
        await this.prisma.projectRolePermission.createMany({
          data: permissionsToCreate,
          skipDuplicates: true,
        });
      }

      this.logger.log(`${permissionIds.length} permissions added to project role: ${roleId}`);
      
      return await this.prisma.projectRolePermission.findMany({
        where: {
          projectRoleId: roleId,
          projectPermissionId: {
            in: permissionIds,
          },
          deletedAt: null,
        },
        include: {
          projectPermission: true,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to add permissions to project role: ${error.message}`);
      throw this.handleError(error);
    }
  }

  async removePermissionFromRole(roleId: string, permissionId: string) {
    try {
      await this.validateProjectRoleExists(roleId);

      const result = await this.prisma.projectRolePermission.updateMany({
        where: {
          projectRoleId: roleId,
          projectPermissionId: permissionId,
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
        },
      });

      if (result.count === 0) {
        throw new NotFoundException('Permission association not found or already removed');
      }

      this.logger.log(`Permission removed from project role: ${permissionId} <- ${roleId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to remove permission from project role: ${error.message}`);
      throw this.handleError(error);
    }
  }

  async syncRolePermissions(roleId: string, permissionIds: string[]) {
    try {
      await this.validateProjectRoleExists(roleId);

      const currentAssociations = await this.prisma.projectRolePermission.findMany({
        where: {
          projectRoleId: roleId,
          deletedAt: null,
        },
        select: {
          projectPermissionId: true,
        },
      });

      const currentPermissionIds = currentAssociations.map(a => a.projectPermissionId);
      
      const permissionsToAdd = permissionIds.filter(id => !currentPermissionIds.includes(id));
      const permissionsToRemove = currentPermissionIds.filter(id => !permissionIds.includes(id));

      const added = await this.addPermissionsToRole(roleId, permissionsToAdd);
      
      if (permissionsToRemove.length > 0) {
        await this.prisma.projectRolePermission.updateMany({
          where: {
            projectRoleId: roleId,
            projectPermissionId: {
              in: permissionsToRemove,
            },
          },
          data: {
            deletedAt: new Date(),
          },
        });
      }

      this.logger.log(`Project role permissions synchronized: ${roleId}`);
      
      return {
        added,
        removedCount: permissionsToRemove.length,
      };
    } catch (error) {
      this.logger.error(`Failed to sync project role permissions: ${error.message}`);
      throw this.handleError(error);
    }
  }

  // Méthodes utilitaires privées
  private async validateProjectRoleExists(id: string) {
    const exists = await this.prisma.projectRole.count({
      where: { id, deletedAt: null },
    });
    if (exists === 0) {
      throw new NotFoundException(`Project role with ID ${id} not found`);
    }
  }

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