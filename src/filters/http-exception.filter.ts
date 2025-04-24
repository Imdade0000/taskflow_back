  import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger, } from '@nestjs/common';
  import { Request, Response } from 'express';
  
  @Catch()
  export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalExceptionFilter.name);
  
    catch(exception: unknown, host: ArgumentsHost) {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse<Response>();
      const request = ctx.getRequest<Request>();
      
      
      const status = 
        exception instanceof HttpException
          ? exception.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR;
          
      const errorResponse = 
        exception instanceof HttpException
          ? exception.getResponse()
          : {
              statusCode: status,
              message: 'Erreur interne du serveur',
              error: 'INTERNAL_SERVER_ERROR',
            };
            
      
      const errorDetails = {
        ...(typeof errorResponse === 'object' ? errorResponse : { message: errorResponse }),
        path: request.url,
        timestamp: new Date().toISOString(),
        requestId: request.headers['x-request-id'] || 'unknown',
      };
      
      if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
        this.logger.error(
          `[${request.method}] ${request.url} - ${
            exception instanceof Error ? exception.message : 'Erreur inconnue'
          }`,
          exception instanceof Error ? exception.stack : '',
        );
      } else {
        this.logger.warn(
          `[${request.method}] ${request.url} - ${JSON.stringify(errorDetails)}`,
        );
      }
      
      if (process.env.NODE_ENV === 'production' && errorDetails['stack']) {
        delete errorDetails['stack'];
      }
      
     response
        .status(status)
        .json(errorDetails);
    }
  }