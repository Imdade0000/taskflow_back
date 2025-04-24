import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';


/**
 * Guard vérifiant si l'utilisateur est actif et non supprimé
 * Utilise l'utilisateur attaché à la requête par le JwtAuthGuard
 */
@Injectable()
export class IsActiveGuard implements CanActivate {
  constructor(private prismaService: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Si aucun utilisateur n'est attaché à la requête, blocage immédiat
    if (!user || !user.id) {
      throw new UnauthorizedException('Authentification requise');
    }

    // Vérifier que l'utilisateur existe, est actif et n'est pas supprimé
    const dbUser = await this.prismaService.user.findFirst({
      where: {
        id: user.id,
        isActive: true,
        deletedAt: null,
      },
    });

    if (!dbUser) {
      throw new UnauthorizedException('Compte utilisateur inactif ou supprimé');
    }

    // Mettre à jour l'utilisateur dans la requête avec les données fraîches
    request.user = dbUser;
    return true;
  }
}