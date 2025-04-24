import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
  } from '@nestjs/common';
  import { Observable } from 'rxjs';
  import { tap } from 'rxjs/operators';
  import { UsersService } from '../../users/users.service';
  
  @Injectable()
  export class RoleInterceptor implements NestInterceptor {
    private readonly logger = new Logger(RoleInterceptor.name);
    
    constructor(private usersService: UsersService) {}
  
    async intercept(
      context: ExecutionContext,
      next: CallHandler,
    ): Promise<Observable<any>> {
      const req = context.switchToHttp().getRequest();
      const user = req.user;
  
      if (user) {
        try {
          // On pourrait enrichir la requête avec des informations supplémentaires sur le rôle
          const fullUser = await this.usersService.findOne(user.userId);
          req.userRole = fullUser.role;
          
          this.logger.log(
            `Utilisateur ${user.username} avec rôle ${fullUser.role?.name || 'non défini'}`,
          );
        } catch (error) {
          this.logger.error(`Erreur lors de la récupération du rôle: ${error.message}`);
        }
      }
  
      return next.handle();
    }
  }