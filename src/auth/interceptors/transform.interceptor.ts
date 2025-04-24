import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
  statusCode: number;
  timestamp: string;
  path: string;
}

/**
 * Intercepteur pour uniformiser les réponses et masquer les données sensibles
 * Toutes les réponses auront un format cohérent avec des métadonnées
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const statusCode = response.statusCode;
    const path = request.url;

    return next.handle().pipe(
      map(data => {
        // Fonction récursive pour masquer les champs sensibles
        const sanitizeData = (obj: any): any => {
          if (!obj || typeof obj !== 'object') return obj;
          
          if (Array.isArray(obj)) {
            return obj.map(item => sanitizeData(item));
          }
          
          const sanitizedObj = { ...obj };
          
          // Liste des champs sensibles à masquer
          const sensitiveFields = [
            'password', 'twoFactorCode', 'twoFactorExpiry', 
            'refreshToken', 'accessToken'
          ];
          
          // Supprimer les champs sensibles
          sensitiveFields.forEach(field => {
            if (field in sanitizedObj) {
              delete sanitizedObj[field];
            }
          });
          
          // Traiter récursivement les sous-objets
          Object.keys(sanitizedObj).forEach(key => {
            if (typeof sanitizedObj[key] === 'object' && sanitizedObj[key] !== null) {
              sanitizedObj[key] = sanitizeData(sanitizedObj[key]);
            }
          });
          
          return sanitizedObj;
        };

        // Format de réponse uniforme
        return {
          data: sanitizeData(data),
          statusCode,
          timestamp: new Date().toISOString(),
          path,
        };
      }),
    );
  }
}