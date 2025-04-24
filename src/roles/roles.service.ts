import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';


@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.role.findMany({
      where: {
        deletedAt: null
      },
      include: {
        permissions: {
          where: {
            deletedAt: null
          },
          include: {
            permission: true
          }
        }
      }
    });
  }

  async findById(id: string) {
    return this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          where: {
            deletedAt: null
          },
          include: {
            permission: true
          }
        }
      }
    });
  }

  async create(data: { name: string; description?: string }) {
    return this.prisma.role.create({
      data
    });
  }

  async update(id: string, data: { name?: string; description?: string }) {
    return this.prisma.role.update({
      where: { id },
      data
    });
  }

  async delete(id: string) {
    return this.prisma.role.update({
      where: { id },
      data: {
        deletedAt: new Date()
      }
    });
  }

  async addPermissionToRole(roleId: string, permissionId: string) {
    const existingPermission = await this.prisma.rolePermission.findFirst({
      where: {
        roleId,
        permissionId,
      }
    });

    if (existingPermission) {
      if (existingPermission.deletedAt) {
        return this.prisma.rolePermission.update({
          where: { id: existingPermission.id },
          data: { deletedAt: null }
        });
      }
      return existingPermission;
    }
   
    return this.prisma.rolePermission.create({
      data: {
        roleId,
        permissionId
      }
    });
  }

  async removePermissionFromRole(roleId: string, permissionId: string) {
    return this.prisma.rolePermission.updateMany({
      where: {
        roleId,
        permissionId
      },
      data: {
        deletedAt: new Date()
      }
    });
  }

  async assignRoleToUser(userId: string, roleId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { roleId }
    });
  }

  async findByName(name: string) {
    return this.prisma.role.findFirst({
      where: {
        name,
        deletedAt: null
      }
    });
  }

  async addAllPermissionsToRole(roleId: string) {
    const allPermissions = await this.prisma.permission.findMany({
      where: {
        deletedAt: null
      }
    });
    
    // Optimisation : utiliser createMany au lieu de boucles de requêtes individuelles
    const existingPermissions = await this.prisma.rolePermission.findMany({
      where: {
        roleId,
        permissionId: {
          in: allPermissions.map(p => p.id)
        }
      }
    });

    const existingPermissionIds = existingPermissions.map(p => p.permissionId);
    const permissionsToAdd = allPermissions
      .filter(p => !existingPermissionIds.includes(p.id))
      .map(p => ({ roleId, permissionId: p.id }));

    if (permissionsToAdd.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: permissionsToAdd,
        skipDuplicates: true
      });
    }

    // Réactiver les permissions supprimées logiquement
    await this.prisma.rolePermission.updateMany({
      where: {
        roleId,
        permissionId: {
          in: allPermissions.map(p => p.id)
        },
        deletedAt: {
          not: null
        }
      },
      data: {
        deletedAt: null
      }
    });

    // Récupérer toutes les permissions mises à jour
    return this.prisma.rolePermission.findMany({
      where: {
        roleId,
        deletedAt: null
      }
    });
  }

  async addPermissionsToRole(roleId: string, permissionIds: string[]) {
    // Optimisation par rapport aux requêtes individuelles
    if (permissionIds.length === 0) {
      return [];
    }

    // Trouver les permissions existantes (même supprimées logiquement)
    const existingPermissions = await this.prisma.rolePermission.findMany({
      where: {
        roleId,
        permissionId: {
          in: permissionIds
        }
      }
    });

    // Restaurer les permissions supprimées logiquement
    await this.prisma.rolePermission.updateMany({
      where: {
        roleId,
        permissionId: {
          in: permissionIds
        },
        deletedAt: {
          not: null
        }
      },
      data: {
        deletedAt: null
      }
    });

    // Ajouter les nouvelles permissions
    const existingPermissionIds = existingPermissions.map(p => p.permissionId);
    const permissionsToCreate = permissionIds
      .filter(id => !existingPermissionIds.includes(id))
      .map(permissionId => ({ roleId, permissionId }));

    if (permissionsToCreate.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: permissionsToCreate,
        skipDuplicates: true
      });
    }

    // Retourner toutes les permissions pour ce rôle
    return this.prisma.rolePermission.findMany({
      where: {
        roleId,
        permissionId: {
          in: permissionIds
        },
        deletedAt: null
      }
    });
  }

  async removePermissionsFromRole(roleId: string, permissionIds: string[]) {
    if (permissionIds.length === 0) {
      return { count: 0 };
    }

    return this.prisma.rolePermission.updateMany({
      where: {
        roleId,
        permissionId: {
          in: permissionIds
        }
      },
      data: {
        deletedAt: new Date()
      }
    });
  }

  async syncRolePermissions(roleId: string, permissionIds: string[]) {
    const currentPermissions = await this.prisma.rolePermission.findMany({
      where: {
        roleId,
        deletedAt: null
      },
      select: {
        permissionId: true
      }
    });
    
    const currentPermissionIds = currentPermissions.map(p => p.permissionId);
    
    const permissionsToAdd = permissionIds.filter(id => !currentPermissionIds.includes(id));
    const permissionsToRemove = currentPermissionIds.filter(id => !permissionIds.includes(id));
    
    const added = await this.addPermissionsToRole(roleId, permissionsToAdd);
    const removed = await this.removePermissionsFromRole(roleId, permissionsToRemove);
    
    return {
      added,
      removed
    };
  }

  async setHasAllPermissions(roleId: string, value: boolean) {
    const updatedRole = await this.prisma.role.update({
      where: { id: roleId },
      data: { hasAllPermissions: value }
    });
  
    if (value === true) {
      await this.addAllPermissionsToRole(roleId);
    }
  
    return updatedRole;
  }
}