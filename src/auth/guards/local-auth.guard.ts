// src/auth/guards/local-auth.guard.ts
import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  constructor() {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // Appeler la méthode canActivate du parent (AuthGuard)
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // Gérer les erreurs ou l'absence d'utilisateur
    if (err || !user) {
      throw err || new UnauthorizedException('Identifiants invalides');
    }
    
    // Si l'utilisateur a l'authentification à deux facteurs activée mais n'a pas encore validé le code 2FA,
    // nous pouvons soit renvoyer un utilisateur partiel, soit lancer une exception personnalisée
    // selon la logique de l'application
    
    return user;
  }
}