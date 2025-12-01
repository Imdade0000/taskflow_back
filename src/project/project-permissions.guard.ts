import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ProjectPermissionService } from './project-permission.service';
import { REQUIRE_PROJECT_PERMISSIONS_KEY } from './decorator/require-project-permissions.decorator';
import { PrismaService } from '../prisma/prisma.service'; 

@Injectable()
export class ProjectPermissionsGuard implements CanActivate {
  private readonly logger = new Logger(ProjectPermissionsGuard.name);
  
  constructor(
    private reflector: Reflector,
    private projectPermissionService: ProjectPermissionService,
    private prisma: PrismaService, // Ajoutez cette dépendance
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
        REQUIRE_PROJECT_PERMISSIONS_KEY,
        [context.getHandler(), context.getClass()],
      );

      if (!requiredPermissions || requiredPermissions.length === 0) {
        return true;
      }

      const request = context.switchToHttp().getRequest();
      const user = request.user;
      const projectId = request.params.projectId || request.body.projectId;

      if (!user) {
        this.logger.warn('No user found in request');
        throw new ForbiddenException('User not authenticated');
      }

      if (!projectId) {
        this.logger.warn('No projectId found in request params or body');
        throw new ForbiddenException('Project ID required for project permission check');
      }

      // NOUVEAU: Vérifier si l'utilisateur a toutes les permissions système
      const userWithRole = await this.prisma.user.findUnique({
        where: { id: user.id },
        include: {
          role: true
        }
      });

      // Si l'utilisateur a toutes les permissions système, lui donner accès
      if (userWithRole?.role?.hasAllPermissions) {
        this.logger.debug(
          `User ${user.id} has system-wide permissions (hasAllPermissions: true) - granting access to project ${projectId}`
        );
        return true;
      }

      // Sinon, vérifier les permissions au niveau du projet comme avant
      for (const permission of requiredPermissions) {
        const hasPermission = await this.projectPermissionService.checkUserHasProjectPermission(
          user.id,
          projectId,
          permission,
        );

        if (!hasPermission) {
          this.logger.warn(
            `User ${user.id} lacks required project permission: ${permission} for project ${projectId}`,
          );
          throw new ForbiddenException(
            `Insufficient project permissions. Required: ${permission}`,
          );
        }
      }

      this.logger.debug(
        `User ${user.id} has required project permissions: ${requiredPermissions.join(', ')} for project ${projectId}`,
      );
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
     
      this.logger.error('Error in ProjectPermissionsGuard:', error);
      throw new ForbiddenException('Permission check failed');
    }
  }
}