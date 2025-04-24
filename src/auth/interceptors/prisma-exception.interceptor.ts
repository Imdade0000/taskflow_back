  import { Injectable, NestInterceptor, ExecutionContext, CallHandler, BadRequestException, ConflictException, InternalServerErrorException, NotFoundException,} from '@nestjs/common';
  import { Observable, throwError } from 'rxjs';
  import { catchError } from 'rxjs/operators';
  import { Prisma } from '@prisma/client';
  
  @Injectable()
  export class PrismaExceptionInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
      return next.handle().pipe(
        catchError(error => {
          if (error instanceof Prisma.PrismaClientKnownRequestError) {
            switch (error.code) {
              case 'P2002':
                return throwError(
                  () => new ConflictException({
                    statusCode: 409,
                    message: `Contrainte d'unicité violée: ${error.meta?.target || 'champ inconnu'}`,
                    error: 'UNIQUE_CONSTRAINT_VIOLATION',
                  }),
                );
              case 'P2003': 
                return throwError(
                  () => new BadRequestException({
                    statusCode: 400,
                    message: `Contrainte de clé étrangère violée`,
                    error: 'FOREIGN_KEY_CONSTRAINT_VIOLATION',
                  }),
                );
              case 'P2025': 
                return throwError(
                  () => new NotFoundException({
                    statusCode: 404,
                    message: `Enregistrement introuvable`,
                    error: 'RECORD_NOT_FOUND',
                  }),
                );
              default:
                return throwError(
                  () => new BadRequestException({
                    statusCode: 400,
                    message: `Erreur de base de données: ${error.message}`,
                    error: `PRISMA_ERROR_${error.code}`,
                  }),
                );
            }
          } else if (error instanceof Prisma.PrismaClientValidationError) {
            return throwError(
              () => new BadRequestException({
                statusCode: 400,
                message: 'Erreur de validation des données',
                error: 'VALIDATION_ERROR',
              }),
            );
          } else if (error instanceof Prisma.PrismaClientInitializationError) {
            return throwError(
              () => new InternalServerErrorException({
                statusCode: 500,
                message: 'Erreur lors de l\'initialisation de la base de données',
                error: 'DATABASE_INITIALIZATION_ERROR',
              }),
            );
          }
  
          return throwError(() => error);
        }),
      );
    }
  }