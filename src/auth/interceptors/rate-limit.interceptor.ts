import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from 'src/prisma/prisma.service';


/**
 * Configuration pour le rate limiting
 */
export interface RateLimitConfig {
  windowMs: number;      
  maxRequests: number;   
  message: string;       
}

/**
 * Intercepteur de limitation de débit pour protéger contre les attaques par force brute
 * Limite le nombre de requêtes par adresse IP et route
 */
@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RateLimitInterceptor.name);
  private requests = new Map<string, { count: number, timestamp: number }>();
  
  
  private readonly defaultConfig: RateLimitConfig = {
    windowMs: 60000,            
    maxRequests: 60,           
    message: 'Trop de requêtes, veuillez réessayer plus tard',
  };
  
  
  private readonly pathConfigs: Record<string, RateLimitConfig> = {
    '/auth/login': {
      windowMs: 300000,     
      maxRequests: 5,       
      message: 'Trop de tentatives de connexion, veuillez réessayer plus tard',
    },
    '/auth/register': {
      windowMs: 3600000,        
      maxRequests: 3,          
      message: 'Trop de tentatives d\'inscription, veuillez réessayer plus tard',
    },
    '/auth/refresh': {
      windowMs: 60000,       
      maxRequests: 10,       
      message: 'Trop de tentatives de rafraîchissement de token, veuillez réessayer plus tard',
    },
    '/auth/two-factor': {
      windowMs: 300000,     
      maxRequests: 5,      
      message: 'Trop de tentatives de validation 2FA, veuillez réessayer plus tard',
    }
  };

  constructor(private prismaService: PrismaService) {
    setInterval(() => this.cleanup(), 60000);
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    const ip = request.ip;
    const path = request.path;
    
   const config = this.getConfigForPath(path);
    
    const key = `${ip}-${path}`;
    const now = Date.now();

    if (!this.requests.has(key)) {
      this.requests.set(key, { count: 1, timestamp: now });
    } else {
      const request = this.requests.get(key);
      
      if (request && now - request.timestamp > config.windowMs) {
        this.requests.set(key, { count: 1, timestamp: now });
      } else if (request && request.count >= config.maxRequests) {
        this.logger.warn(`Rate limit dépassé: ${ip} pour ${path} - ${request.count} requêtes`);
        
        // Journaliser dans la base de données si nécessaire
       /* try {
          await this.prismaService.securityLog.create({
            data: {
              action: 'RATE_LIMIT_EXCEEDED',
              ip,
              path,
              details: JSON.stringify({ 
                count: request.count, 
                limit: config.maxRequests 
              }),
              timestamp: new Date(),
            },
          });
        } catch (error) {
          this.logger.error('Erreur lors de la journalisation du rate limit', error);
        } */
        
        
        response.header('Retry-After', Math.ceil((config.windowMs - (now - request.timestamp)) / 1000).toString());
        response.header('X-RateLimit-Limit', config.maxRequests.toString());
        response.header('X-RateLimit-Remaining', '0');
        response.header('X-RateLimit-Reset', request ? Math.ceil((request.timestamp + config.windowMs) / 1000).toString() : '0');
        
        throw new HttpException(config.message, HttpStatus.TOO_MANY_REQUESTS);
      } else {
       
        if (request) {
          request.count++;
        }
        if (request) {
          this.requests.set(key, request);
        }
        
       
        response.header('X-RateLimit-Limit', config.maxRequests.toString());
        response.header('X-RateLimit-Remaining', (config.maxRequests - (request?.count ?? 0)).toString());
        response.header('X-RateLimit-Reset', request ? Math.ceil((request.timestamp + config.windowMs) / 1000).toString() : '0');
      }
    }

    return next.handle();
  }

 
  private getConfigForPath(path: string): RateLimitConfig {
    
    if (path in this.pathConfigs) {
      return this.pathConfigs[path];
    }
    
    
    for (const configPath in this.pathConfigs) {
      if (path.startsWith(configPath)) {
        return this.pathConfigs[configPath];
      }
    }
    
   
    return this.defaultConfig;
  }

  
  private cleanup() {
    const now = Date.now();
    for (const [key, value] of this.requests.entries()) {
     const path = key.split('-').slice(1).join('-');
      const config = this.getConfigForPath(path);
      
      if (now - value.timestamp > config.windowMs) {
        this.requests.delete(key);
      }
    }
  }
}