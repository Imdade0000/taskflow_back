import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcrypt';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import * as crypto from 'crypto';
import { 
  InvalidCredentialsException, 
  UserDisabledException, 
  InvalidTwoFactorCodeException, 
  InvalidRefreshTokenException, 
  TokenEncryptionException, 
  TokenGenerationException,
} from './exceptions/auth-exceptions';
import { MailerService } from 'src/mailler/mailler.service';

@Injectable()
export class AuthService {
  constructor(
    private userService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private mailerService: MailerService,
  ) {}

  /**
   * Valide un utilisateur par son nom d'utilisateur et mot de passe
   * @param username Nom d'utilisateur
   * @param password Mot de passe
   * @returns L'utilisateur validé ou null
   */
  async validateUser(username: string, password: string): Promise<any> {
    try {
      const user = await this.userService.findByUsername(username);
      
      if (!user) {
        throw new InvalidCredentialsException();
      }

      if (!user.isActive) {
        throw new UserDisabledException();
      }

      const isPasswordValid = await compare(password, user.password);
      
      if (!isPasswordValid) {
        throw new InvalidCredentialsException();
      }

      const { password: _, ...result } = user;
      return result;
    } catch (error) {
      if (error instanceof InvalidCredentialsException || error instanceof UserDisabledException) {
        throw error;
      }
      
      throw new InvalidCredentialsException('Erreur lors de la validation de l\'utilisateur');
    }
  }

  /**
   * Connecte un utilisateur sans double authentification
   * @param user Utilisateur
   * @returns Tokens JWT
   */
  async loginWithoutTwoFactor(user: User) {
    try {
      const payload = { username: user.username, sub: user.id };
      
      const accessToken = this.jwtService.sign(payload, {
        expiresIn: '15m',
      });

      const refreshToken = this.jwtService.sign(payload, {
        expiresIn: '7d',
      });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await this.prisma.refreshToken.create({
        data: {
          token: refreshToken,
          expiresAt,
          userId: user.id,
        },
      });

      return {
        accessToken,
        refreshToken,
        requiresTwoFactor: false,
      };
    } catch (error) {
      throw new TokenGenerationException('Erreur lors de la génération des tokens d\'authentification');
    }
  }

  /**
   * Connecte un utilisateur avec double authentification
   * @param user Utilisateur
   * @returns Tokens temporaires et indicateur de 2FA requis
   */
  async loginWithTwoFactor(user: User) {
    try {
      const payload = { username: user.username, sub: user.id };
      
      // Le token de rafraîchissement est créé même avec 2FA
      const refreshToken = this.jwtService.sign(payload, {
        expiresIn: '7d',
      });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await this.prisma.refreshToken.create({
        data: {
          token: refreshToken,
          expiresAt,
          userId: user.id,
        },
      });

      // Génération et envoi du code 2FA
      console.log('[DEBUG] Génération du code 2FA');
      const encryptedCode = this.generateTwoFactorCode();
      const decryptedCode = this.decryptTwoFactorCode(encryptedCode);
      
      await this.userService.updateTwoFactorCode(user.id, encryptedCode);
      console.log('[DEBUG] Code généré:', decryptedCode);

      await this.mailerService.sendTwoFactorCode(
        user.email,
        decryptedCode,
        `${user.firstname} ${user.lastname}`
      );
      console.log('[DEBUG] Email envoyé');

      return {
        refreshToken,
        requiresTwoFactor: true,
      };
    } catch (error) {
      console.error('[ERROR] 2FA error:', error);
      throw new TokenGenerationException('Erreur lors de la génération ou l\'envoi du code d\'authentification à deux facteurs');
    }
  }
 /**
   * Connecte un utilisateur et génère des tokens selon si la double authentification est activée
   * @param user Utilisateur
   * @returns Tokens JWT ou indicateur de 2FA requis
   */
 async login(user: User) {
  try {
    if (user.twoFactorEnabled) {
      return await this.loginWithTwoFactor(user);
    } else {
      return await this.loginWithoutTwoFactor(user);
    }
  } catch (error) {
    if (error instanceof TokenGenerationException) {
      throw error;
    }
    
    throw new TokenGenerationException('Erreur lors de la génération des tokens d\'authentification');
  }
}

/**
 * Active la double authentification pour un utilisateur
 * @param userId ID de l'utilisateur
 * @returns Message de confirmation et code temporaire pour validation
 */
async enableTwoFactor(userId: string) {
  try {
    const user = await this.userService.findOne(userId);
    
    if (!user) {
      throw new InvalidCredentialsException('Utilisateur inexistant');
    }
    
    if (!user.isActive) {
      throw new UserDisabledException();
    }

    // Génération d'un code de validation pour l'activation
    const encryptedCode = this.generateTwoFactorCode();
    const decryptedCode = this.decryptTwoFactorCode(encryptedCode);
    
    // Mise à jour du code sans activer immédiatement la 2FA
    await this.userService.updateTwoFactorCode(user.id, encryptedCode);
    
    // Envoi du code par email pour validation
    await this.mailerService.sendTwoFactorCode(
      user.email,
      decryptedCode,
      `${user.firstname} ${user.lastname}`,
      true // Indiquer qu'il s'agit d'une activation de 2FA
    );

    return {
      message: 'Un code de validation a été envoyé à votre adresse email pour activer la double authentification',
    };
  } catch (error) {
    if (error instanceof InvalidCredentialsException || error instanceof UserDisabledException) {
      throw error;
    }
    
    throw new TokenGenerationException('Erreur lors de la préparation de l\'activation de la double authentification');
  }
}

/**
 * Confirme l'activation de la double authentification avec un code
 * @param userId ID de l'utilisateur
 * @param code Code de validation
 * @returns Message de confirmation
 */
async confirmTwoFactorEnable(userId: string, code: string) {
  try {
    const isValid = await this.userService.verifyTwoFactorCode(userId, code);
    
    if (!isValid) {
      throw new InvalidTwoFactorCodeException();
    }

    // Activation de la double authentification
    await this.userService.enableTwoFactor(userId);
    
    return {
      message: 'La double authentification a été activée avec succès',
    };
  } catch (error) {
    if (error instanceof InvalidTwoFactorCodeException) {
      throw error;
    }
    
    throw new TokenGenerationException('Erreur lors de l\'activation de la double authentification');
  }
}

/**
 * Désactive la double authentification pour un utilisateur
 * @param userId ID de l'utilisateur
 * @returns Message de confirmation
 */
async disableTwoFactor(userId: string) {
  try {
    await this.userService.disableTwoFactor(userId);
    
    return {
      message: 'La double authentification a été désactivée avec succès',
    };
  } catch (error) {
    console.error('[DISABLE 2FA ERROR]', error);
    throw new TokenGenerationException( 'Erreur lors de la désactivation de la double authentification');
  }
}

/**
 * Inscrit un nouvel utilisateur avec double authentification désactivée par défaut
 * @param createUserDto Données du nouvel utilisateur
 * @returns L'utilisateur créé sans le mot de passe
 */
async register(createUserDto: any) {
  try {
    
    const userWithTwoFactorDisabled = {
      ...createUserDto,
      twoFactorEnabled: false
    };
    
    const { ...result } = await this.userService.create(userWithTwoFactorDisabled);
    return result;
  } catch (error) {
    
    throw error;
  }
}

  /**
   * Rafraîchit le token JWT
   * @param token Token de rafraîchissement
   * @returns Nouveau token d'accès
   */
  async refreshToken(token: string) {
    try {
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token },
        include: { user: true },
      });

      if (!storedToken || storedToken.expiresAt < new Date()) {
        throw new InvalidRefreshTokenException();
      }
      const payload = this.jwtService.verify(token);
      
      const user = await this.userService.findOne(payload.sub);
      
      if (!user) {
        throw new InvalidRefreshTokenException('Token associé à un utilisateur inexistant');
      }

      if (!user.isActive) {
        throw new UserDisabledException();
      }

      const newPayload = { username: user.username, sub: user.id };
      const accessToken = this.jwtService.sign(newPayload, {
        expiresIn: '7d',
      });

      return {
        accessToken,
      };
    } catch (error) {
      if (error instanceof InvalidRefreshTokenException || error instanceof UserDisabledException) {
        throw error;
      }

      if (error.name === 'JsonWebTokenError') {
        throw new InvalidRefreshTokenException('Format de token invalide');
      }
      
      if (error.name === 'TokenExpiredError') {
        throw new InvalidRefreshTokenException('Token expiré');
      }
      
      throw new InvalidRefreshTokenException();
    }
  }


  /**
   * Vérifie le code 2FA d'un utilisateur
   * @param userId ID de l'utilisateur
   * @param code Code 2FA
   * @returns Nouveau token d'accès si le code est valide
   */
  async verifyTwoFactor(userId: string, code: string) {
    try {
      const isValid = await this.userService.verifyTwoFactorCode(userId, code);
      
      if (!isValid) {
        throw new InvalidTwoFactorCodeException();
      }

      const user = await this.userService.findOne(userId);
      
      if (!user) {
        throw new InvalidCredentialsException('Utilisateur inexistant');
      }
      
      if (!user.isActive) {
        throw new UserDisabledException();
      }
      
      const payload = { username: user.username, sub: user.id };
      const accessToken = this.jwtService.sign(payload, {
        expiresIn: '15m',
      });

      return {
        accessToken,
      };
    } catch (error) {
      if (error instanceof InvalidTwoFactorCodeException || 
          error instanceof InvalidCredentialsException ||
          error instanceof UserDisabledException) {
        throw error;
      }
      
      throw new InvalidTwoFactorCodeException();
    }
  }

  /**
   * Génère un code 2FA crypté
   * @returns Code 2FA à 6 chiffres
   */
  private generateTwoFactorCode(): string {
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      const SECRET_KEY = process.env.TWO_FACTOR_SECRET || 'your-secret-key';
     
      const key = crypto.createHash('sha256').update(String(SECRET_KEY)).digest('base64').substring(0, 32);
      
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
      let encrypted = iv.toString('hex') + ':';
      encrypted += cipher.update(code, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return encrypted;
    } catch (error) {
      console.error('Erreur de chiffrement:', error);
      throw new TokenEncryptionException('Erreur lors du chiffrement du code 2FA');
    }
  }

  /**
   * Déchiffre un code 2FA
   * @param encryptedCode Code 2FA crypté
   * @returns Code 2FA décrypté
   */
  private decryptTwoFactorCode(encryptedCode: string): string {
    try {
      const SECRET_KEY = process.env.TWO_FACTOR_SECRET || 'your-secret-key';
      
      const key = crypto.createHash('sha256').update(String(SECRET_KEY)).digest('base64').substring(0, 32);
      
      const [ivHex, encryptedData] = encryptedCode.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Erreur de déchiffrement:', error);
      throw new TokenEncryptionException('Erreur lors du déchiffrement du code 2FA');
    }
  }

  /**
   * Déconnecte un utilisateur en invalidant son token de rafraîchissement
   * @param userId ID de l'utilisateur
   * @param token Token de rafraîchissement à invalider
   */
  async logout(userId: string, token: string) {
    try {
      await this.prisma.refreshToken.deleteMany({
        where: {
          userId,
          token,
        },
      });
      
      return { message: 'Déconnexion réussie' };
    } catch (error) {
      return { message: 'Déconnexion réussie' };
    }
  }
}