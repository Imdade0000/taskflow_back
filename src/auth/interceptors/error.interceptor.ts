import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

/**
 * Intercepteur pour gérer les erreurs de manière cohérente et sécurisée
 * Masque les détails sensibles des erreurs en production
 */
@Injectable()
export class ErrorInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ErrorInterceptor.name);
  private readonly isProduction = process.env.NODE_ENV === 'production';

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { url, method, ip, body, params, query } = request;
    
    return next.handle()
      .pipe(
        catchError(error => {
         
          const requestDetails = {
            url,
            method,
            ip,
            timestamp: new Date().toISOString(),
            body: this.isProduction ? '(masqué)' : this.sanitizeRequest(body),
            params: this.isProduction ? '(masqué)' : params,
            query: this.isProduction ? '(masqué)' : query
          };
          
         this.logger.error(
            `Erreur pour ${method} ${url}`, 
            { 
              error: error.message || error.toString(),
              stack: error.stack,
              request: requestDetails 
            }
          );
          
          if (error instanceof HttpException) {
            return throwError(() => error);
          }
          
          if (this.isProduction) {
            return throwError(() => new HttpException(
              'Une erreur interne est survenue',
              HttpStatus.INTERNAL_SERVER_ERROR
            ));
          }
          
          return throwError(() => new HttpException(
            {
              statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
              message: error.message || 'Erreur interne du serveur',
              timestamp: new Date().toISOString(),
              path: url
            },
            HttpStatus.INTERNAL_SERVER_ERROR
          ));
        }),
      );
  }

  private sanitizeRequest(body: any): any {
    if (!body) return body;
    
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'refreshToken', 'accessToken', 'twoFactorCode'];
    
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '***';
      }
    }
    
    return sanitized;
  }
}