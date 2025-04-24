// roles/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES_KEY } from '../decorators/require-role.decorator';


@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.get<string[]>(
      ROLES_KEY,
      context.getHandler(),
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // Récupérer le rôle de l'utilisateur
    const userWithRole = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: {
        role: true,
      },
    });

    if (!userWithRole || !userWithRole.role) {
      throw new ForbiddenException('Aucun rôle assigné à cet utilisateur');
    }

    const hasRequiredRole = requiredRoles.some(
      role => userWithRole.role?.name === role
    );

    if (!hasRequiredRole) {
      throw new ForbiddenException(
        `Rôle requis: l'un des rôles suivants est nécessaire [${requiredRoles.join(', ')}]`
      );
    }

    return true;
  }
}