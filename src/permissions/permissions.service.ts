import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.permission.findMany({
      where: {
        deletedAt: null
      }
    });
  }
  
  async getRolePermissions(roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: {
          where: { deletedAt: null },
          include: {
            permission: true
          }
        }
      }
    });

    if (!role) {
      return [];
    }

    return role.permissions.map(rp => rp.permission);
  }

  async findById(id: string) {
    return this.prisma.permission.findUnique({
      where: { id }
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.permission.findUnique({
      where: { slug }
    });
  }

  async create(data: { name: string; slug: string; description?: string }) {
  
    const newPermission = await this.prisma.permission.create({
      data
    });
  
   
    const privilegedRoles = await this.prisma.role.findMany({
      where: {
        hasAllPermissions: true,
        deletedAt: null
      }
    });
  
   
    for (const role of privilegedRoles) {
      await this.prisma.rolePermission.create({
        data: {
          roleId: role.id,
          permissionId: newPermission.id
        }
      });
    }
  
    return newPermission;
  }

  async update(id: string, data: { name?: string; slug?: string; description?: string }) {
    return this.prisma.permission.update({
      where: { id },
      data
    });
  }

  async delete(id: string) {
    return this.prisma.permission.update({
      where: { id },
      data: {
        deletedAt: new Date()
      }
    });
  }

  async getUserPermissions(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: {
              where: { deletedAt: null },
              include: {
                permission: true
              }
            }
          }
        }
      }
    });

    if (!user || !user.role) {
      return [];
    }

    return user.role.permissions.map(rp => rp.permission);
  }

  async checkUserHasPermission(userId: string, permissionSlug: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true
      }
    });
  
    if (!user || !user.role) {
      return false;
    }
  
    // Vérifier d'abord si le rôle a tous les droits
    if (user.role.hasAllPermissions) {
      return true;
    }
  
    // Sinon, vérifier les permissions spécifiques
    const userPermissions = await this.getUserPermissions(userId);
    return userPermissions.some(permission => permission.slug === permissionSlug);
  }

  // permissions.service.ts
async seedDefaultPermissions() {
  const defaultPermissions = [
    { slug: 'roles.list', name: 'Lister les rôles', description: 'Permission de voir la liste des rôles' },
    { slug: 'roles.view', name: 'Voir un rôle', description: 'Permission de voir les détails d\'un rôle' },
    { slug: 'roles.create', name: 'Créer un rôle', description: 'Permission de créer un nouveau rôle' },
    { slug: 'roles.update', name: 'Modifier un rôle', description: 'Permission de modifier un rôle existant' },
    { slug: 'roles.delete', name: 'Supprimer un rôle', description: 'Permission de supprimer un rôle' },
    { slug: 'permissions.list', name: 'Lister les permissions', description: 'Permission de voir la liste des permissions' },
    // Ajoutez d'autres permissions nécessaires
  ];

  for (const perm of defaultPermissions) {
    await this.prisma.permission.upsert({
      where: { slug: perm.slug },
      create: perm,
      update: perm
    });
  }

  console.log('Permissions par défaut créées avec succès');
}
}