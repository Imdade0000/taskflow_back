import { Injectable, Logger } from '@nestjs/common';
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
import * as bcrypt from 'bcrypt';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isEmail } from 'validator';

@Injectable()
export class AuthService {
     private readonly logger = new Logger(AuthService.name);

  constructor(
    private userService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private mailerService: MailerService,
    private configService: ConfigService
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
    // 1. NETTOYER TOUS LES ANCIENS REFRESH TOKENS
    console.log('[LOGIN] Cleaning old refresh tokens for user:', user.id);
    await this.prisma.refreshToken.deleteMany({
      where: { userId: user.id }
    });

    const payload = { username: user.username, sub: user.id };
    
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    // 2. CRÉER UN NOUVEAU REFRESH TOKEN UNIQUE
    const refreshTokenPayload = {
      username: user.username,
      sub: user.id,
      random: crypto.randomBytes(16).toString('hex'), // Ajout d'entropie
      timestamp: Date.now() // Ajout timestamp pour l'unicité
    };

    const refreshToken = this.jwtService.sign(refreshTokenPayload, {
      expiresIn: '7d',
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // 3. SAUVEGARDER LE NOUVEAU TOKEN
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        expiresAt,
        userId: user.id,
      },
    });

    console.log('[LOGIN] New refresh token created for user:', user.id);

    return {
      accessToken,
      refreshToken,
      requiresTwoFactor: false,
    };
  } catch (error) {
    console.error('[LOGIN] Error in loginWithoutTwoFactor:', error);
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
    console.log('[2FA LOGIN] Starting 2FA login process for user:', user.id);
    
    // 1. Suppression des anciens refresh tokens
    console.log('[2FA LOGIN] Cleaning old refresh tokens...');
    await this.prisma.refreshToken.deleteMany({
      where: { userId: user.id }
    });

    // 2. Génération d'un nouveau refresh token unique
    console.log('[2FA LOGIN] Generating unique refresh token...');
    const refreshToken = await this.generateUniqueRefreshToken(user.id, user.username);
    
    // 3. Génération du code 2FA et token temporaire
    console.log('[2FA LOGIN] Generating 2FA code...');
    const encryptedCode = this.generateTwoFactorCode();
    const decryptedCode = this.decryptTwoFactorCode(encryptedCode);
    
    // 4. Création d'un token temporaire sécurisé
    const tempToken = this.jwtService.sign(
      {
        sub: user.id,
        codeHash: await bcrypt.hash(encryptedCode, 10),
        purpose: '2fa_verification'
      },
      { 
        expiresIn: '5m'
      }
    );

    // 5. Mise à jour du code en base de données
    await this.userService.updateTwoFactorCode(user.id, encryptedCode);
    console.log('[2FA LOGIN] 2FA code generated and saved');

    // 6. Envoi du code par email
    await this.mailerService.sendTwoFactorCode(
      user.email,
      decryptedCode,
      `${user.firstname} ${user.lastname}`
    );
    console.log('[2FA LOGIN] 2FA email sent successfully');

    return {
      refreshToken, // Pour les requêtes de refresh token
      tempToken,    // Pour la vérification 2FA
      requiresTwoFactor: true
    };
  } catch (error) {
    console.error('[2FA LOGIN] Error in loginWithTwoFactor:', error);
    throw new TokenGenerationException(
      'Erreur lors de la génération ou l\'envoi du code d\'authentification à deux facteurs'
    );
  }
}

/**
 * Génère un refresh token unique avec retry en cas de collision
 * @param userId ID de l'utilisateur
 * @param username Nom d'utilisateur
 * @returns Token de rafraîchissement unique
 */
private async generateUniqueRefreshToken(userId: string, username: string): Promise<string> {
  const maxAttempts = 3;
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      // Payload avec plus d'entropie pour éviter les collisions
      const payload = { 
        username: username, 
        sub: userId,
        random: crypto.randomBytes(20).toString('hex'), // Plus d'entropie
        timestamp: Date.now(),
        attempt: attempts
      };
      
      const refreshToken = this.jwtService.sign(payload, {
        expiresIn: '7d',
      });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Tentative de création du token
      await this.prisma.refreshToken.create({
        data: {
          token: refreshToken,
          expiresAt,
          userId,
        },
      });

      console.log('[TOKEN GEN] Unique refresh token created successfully for user:', userId);
      return refreshToken;
      
    } catch (error) {
      if (error.code === 'P2002') { // Violation de contrainte d'unicité
        attempts++;
        console.warn(`[TOKEN GEN] Token collision detected, attempt ${attempts}/${maxAttempts}`);
        
        if (attempts >= maxAttempts) {
          console.error('[TOKEN GEN] Max attempts reached, failing token generation');
          throw new Error('Échec après plusieurs tentatives de génération de token');
        }
        
        // Attendre un peu avant de réessayer
        await new Promise(resolve => setTimeout(resolve, 100 * attempts));
        continue;
      }
      
      console.error('[TOKEN GEN] Unexpected error during token generation:', error);
      throw error;
    }
  }
  
  throw new Error('Échec de génération de token unique');
}

/**
 * Nettoie les refresh tokens expirés (méthode utilitaire)
 * @returns Nombre de tokens supprimés
 */
async cleanupExpiredTokens(): Promise<number> {
  try {
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });
    
    if (result.count > 0) {
      console.log(`[CLEANUP] Cleaned up ${result.count} expired refresh tokens`);
    }
    
    return result.count;
  } catch (error) {
    console.error('[CLEANUP] Error cleaning expired tokens:', error);
    return 0;
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
      twoFactorEnabled: true
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
async refreshToken(refreshToken: string) {
  try {
    // Vérifier que le refresh token est valide
    const payload = this.jwtService.verify(refreshToken, {
      secret: process.env.JWT_REFRESH_SECRET,
    });

    // Récupérer l’utilisateur en DB si besoin
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new UnauthorizedException('Utilisateur non trouvé');
    }

    // Générer un nouveau access token
    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' },
    );

    // Optionnel : regénérer aussi un nouveau refresh token
    const newRefreshToken = this.jwtService.sign(
      { sub: user.id },
      { secret: process.env.JWT_REFRESH_SECRET, expiresIn: '7d' },
    );

    return {
      accessToken,
      refreshToken: newRefreshToken, // si tu veux le renvoyer
    };
  } catch (error) {
    throw new UnauthorizedException('Token de rafraîchissement invalide');
  }
}



  /**
   * Vérifie le code 2FA d'un utilisateur
   * @param userId ID de l'utilisateur
   * @param code Code 2FA
   * @returns Nouveau token d'accès si le code est valide
   */
  // Dans votre auth.service.ts (backend)
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


 async sendPasswordResetEmail(email: string): Promise<void> {
  // Vérification de la configuration
  const frontendUrl = this.configService.get('APP_FRONTEND_URL');
  if (!frontendUrl) {
    throw new Error(
      `Configuration manquante: APP_FRONTEND_URL. 
      Vérifiez votre fichier .env et assurez-vous que ConfigModule est importé`
    );
  }

  // 2. Recherche de l'utilisateur
  const user = await this.userService.findByEmail(email);
  if (!user) {
    console.log('Aucun utilisateur trouvé pour:', email);
    return; // Sortie silencieuse pour sécurité
  }

  // 3. Génération du token avec vérification
  const resetToken = crypto.randomBytes(32).toString('hex');
  if (!resetToken) {
    throw new Error('Échec de génération du token');
  }

  // 4. Construction de l'URL
  
  if (!frontendUrl) {
    throw new Error('APP_FRONTEND_URL non configuré');
  }
  
  const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
  console.log('URL générée:', resetUrl); // Debug crucial

  // 5. Sauvegarde du token
  await this.prisma.passwordResetToken.create({
    data: {
      token: resetToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      userId: user.id
    }
  });

  // 6. Envoi de l'email
  await this.mailerService.sendPasswordResetEmail(
    user.email,
    resetToken, // Envoi du token brut
    `${user.firstname} ${user.lastname}`
  );
}

async resetPassword(token: string, newPassword: string): Promise<void> {
  // 1. Validation du token
  const resetToken = await this.prisma.passwordResetToken.findFirst({
    where: { 
      token,
      expiresAt: { gt: new Date() }
    },
    include: { user: true }
  });

  if (!resetToken) {
    throw new BadRequestException('Token invalide ou expiré');
  }

  // 2. Mise à jour du mot de passe
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await this.prisma.$transaction([
    this.prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword }
    }),
    this.prisma.passwordResetToken.delete({
      where: { id: resetToken.id }
    })
  ]);

  // 3. Envoi de confirmation (avec gestion d'erreur)
  try {
    await this.mailerService.sendPasswordChangedEmail(
      resetToken.user.email,
      `${resetToken.user.firstname} ${resetToken.user.lastname}`
    );
  } catch (error) {
    this.logger.error('Échec envoi email de confirmation', error.stack);
    // On ne bloque pas le processus pour cette erreur
  }
  
}

async validateResetToken(token: string): Promise<boolean> {
  const resetToken = await this.prisma.passwordResetToken.findFirst({
    where: { 
      token,
      expiresAt: { gt: new Date() }
    }
  });
  return !!resetToken;
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

