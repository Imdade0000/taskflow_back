import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Décorateur personnalisé pour extraire facilement les informations
 * de l'utilisateur à partir de la requête authentifiée.
 * 
 * Exemple d'utilisation:
 * ```typescript
 * @Get()
 * findOne(@User() user: UserEntity) { ... }
 * 
 * // Ou pour extraire une propriété spécifique:
 * @Get()
 * findOne(@User('id') userId: string) { ... }
 * ```
 */
export const User = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    
    // Vérifie que l'utilisateur existe dans la requête
    // (normalement ajouté par JwtAuthGuard)
    if (!request.user) {
      return null;
    }

    // Si une propriété spécifique est demandée, on la retourne
    // Sinon on retourne l'objet utilisateur complet
    return data ? request.user[data] : request.user;
  },
);