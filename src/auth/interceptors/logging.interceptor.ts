  import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger,} from '@nestjs/common';
  import { Observable } from 'rxjs';
  import { tap } from 'rxjs/operators';
  
  @Injectable()
  export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger(LoggingInterceptor.name);
  
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
      const req = context.switchToHttp().getRequest();
      const { method, url, body, user } = req;
      const userId = user ? user.userId : 'non-authentifié';
  
      const now = Date.now();
      this.logger.log(
        `Requête entrante: ${method} ${url} - Utilisateur: ${userId}`,
      );
  
      return next.handle().pipe(
        tap({
          next: (data) => {
            const responseTime = Date.now() - now;
            this.logger.log(
              `Réponse: ${method} ${url} - ${responseTime}ms - Utilisateur: ${userId}`,
            );
          },
          error: (error) => {
            const responseTime = Date.now() - now;
            this.logger.error(
              `Erreur: ${method} ${url} - ${responseTime}ms - ${error.message} - Utilisateur: ${userId}`,
            );
          },
        }),
      );
    }
  }