// src/common/exceptions/custom-exceptions.ts
import { UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';

export class InvalidTwoFactorCodeException extends UnauthorizedException {
  constructor() {
    super('Le code 2FA est invalide ou expiré.');
  }
}

export class UserNotFoundException extends NotFoundException {
  constructor() {
    super('Utilisateur introuvable.');
  }
}

export class TokenExpiredException extends UnauthorizedException {
  constructor() {
    super('Le token a expiré. Veuillez vous reconnecter.');
  }
}
