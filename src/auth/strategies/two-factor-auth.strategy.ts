import { Strategy } from 'passport-custom';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { Request } from 'express';
import { UpdateTwoFactorDto } from 'src/users/dto/update-two-factor.dto';

@Injectable()
export class TwoFactorAuthStrategy extends PassportStrategy(Strategy, 'two-factor') {
  constructor(private readonly usersService: UsersService) {
    super();
  }

  async validate(req: Request): Promise<any> {
    const { userId, twoFactorCode } = req.body;

    if (!userId || !twoFactorCode) {
      throw new UnauthorizedException('Paramètres d\'authentification à deux facteurs manquants');
    }

    const user = await this.usersService.findForTwoFactor(userId);

    if (!user || !user.twoFactorEnabled) {
      throw new UnauthorizedException('Utilisateur introuvable ou authentification à deux facteurs désactivée');
    }

    
    if (
      user.twoFactorCode !== twoFactorCode||
      !user.twoFactorExpiry ||
      user.twoFactorExpiry < new Date()
    ) {
      throw new UnauthorizedException('Code d\'authentification à deux facteurs invalide ou expiré');
    }

    // Effacer le code après utilisation réussie
    await this.usersService.update(userId, {
        twoFactorCode: null,
        twoFactorExpiry: null,
      } as UpdateTwoFactorDto);

    return { userId: user.id, email: user.email, username: user.username };
  }
}