import { Injectable, NestInterceptor, ExecutionContext, CallHandler, RequestTimeoutException } from '@nestjs/common';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

/**
 * Intercepteur qui met fin aux requêtes qui prennent trop de temps
 * Protège contre les attaques de type DoS par épuisement des ressources
 */
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  private readonly timeoutValue = 60000;

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Extraction du chemin et de la méthode pour le message d'erreur
    const request = context.switchToHttp().getRequest();
    const { url, method } = request;

    return next.handle().pipe(
      timeout(this.timeoutValue),
      catchError(err => {
        if (err instanceof TimeoutError) {
          return throwError(() => new RequestTimeoutException(
            `Délai d'attente dépassé pour la requête ${method} ${url}`
          ));
        }
        return throwError(() => err);
      }),
    );
  }
}