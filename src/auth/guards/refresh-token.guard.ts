import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * Guard spécifique pour valider les tokens de rafraîchissement
 * À utiliser sur les routes de rafraîchissement du token
 */
@Injectable()
export class RefreshTokenGuard implements CanActivate {
  constructor(
    private prismaService: PrismaService,
    private jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Extraire le token de rafraîchissement du corps de la requête
    const refreshToken = request.body.refreshToken;
    
    if (!refreshToken) {
      throw new UnauthorizedException('Token de rafraîchissement manquant');
    }
    
    try {
      // Vérifier la signature du token
      const payload = this.jwtService.verify(refreshToken);
      
      // Vérifier l'existence du token en base de données
      const storedToken = await this.prismaService.refreshToken.findFirst({
        where: { 
          token: refreshToken,
          userId: payload.sub,
          expiresAt: {
            gt: new Date() // Vérifie que le token n'est pas expiré
          }
        },
        include: {
          user: {
            select: {
              id: true,
              isActive: true,
              deletedAt: true
            }
          }
        }
      });
      
      // Vérifier que le token existe et que l'utilisateur associé est actif
      if (!storedToken || !storedToken.user || !storedToken.user.isActive || storedToken.user.deletedAt) {
        throw new UnauthorizedException('Token de rafraîchissement invalide ou expiré');
      }
      
      // Ajouter les informations du token à la requête
      request.refreshToken = storedToken;
      request.user = { id: payload.sub };
      
      return true;
    } catch (error) {
      throw new UnauthorizedException('Token de rafraîchissement invalide ou expiré');
    }
  }
}