import { HttpException, HttpStatus } from '@nestjs/common';

export class InvalidCredentialsException extends HttpException {
  constructor(message = 'Nom d\'utilisateur ou mot de passe incorrect') {
    super(
      {
        statusCode: HttpStatus.UNAUTHORIZED,
        message,
        error: 'INVALID_CREDENTIALS',
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class UserDisabledException extends HttpException {
    constructor(message = 'Ce compte utilisateur est désactivé') {
      super(
        {
          statusCode: HttpStatus.FORBIDDEN,
          message,
          error: 'USER_DISABLED',
        },
        HttpStatus.FORBIDDEN,
      );
    }
  }
  
  export class InvalidTwoFactorCodeException extends HttpException {
    constructor(message = 'Code d\'authentification à deux facteurs invalide ou expiré') {
      super(
        {
          statusCode: HttpStatus.UNAUTHORIZED,
          message,
          error: 'INVALID_2FA_CODE',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
  
  export class InvalidRefreshTokenException extends HttpException {
    constructor(message = 'Token de rafraîchissement invalide ou expiré') {
      super(
        {
          statusCode: HttpStatus.UNAUTHORIZED,
          message,
          error: 'INVALID_REFRESH_TOKEN',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
  
  export class UserExistsException extends HttpException {
    constructor(message = 'Un utilisateur avec ce nom d\'utilisateur ou cette adresse e-mail existe déjà') {
      super(
        {
          statusCode: HttpStatus.CONFLICT,
          message,
          error: 'USER_EXISTS',
        },
        HttpStatus.CONFLICT,
      );
    }
  }
  
  export class TwoFactorRequiredException extends HttpException {
    constructor(message = 'L\'authentification à deux facteurs est requise') {
      super(
        {
          statusCode: HttpStatus.UNAUTHORIZED,
          message,
          error: 'TWO_FACTOR_REQUIRED',
          requiresTwoFactor: true,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
  
  export class TokenEncryptionException extends HttpException {
    constructor(message = 'Erreur lors du chiffrement/déchiffrement du token') {
      super(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message,
          error: 'TOKEN_ENCRYPTION_ERROR',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  
  export class TokenGenerationException extends HttpException {
    constructor(message = 'Erreur lors de la génération du token') {
      super(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message,
          error: 'TOKEN_GENERATION_ERROR',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }