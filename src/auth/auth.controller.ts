import { 
  Controller, 
  Post,
  Get,
  Query, 
  Body, 
  UseGuards, 
  Request, 
  HttpCode, 
  HttpStatus, 
  UnauthorizedException,
  BadRequestException,
  Redirect
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { VerifyTwoFactorDto } from './strategies/verify-two-factor.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { TwoFactorCodeDto } from './dto/two-factor-code.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ConfigService } from '@nestjs/config';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService,
              private readonly configService: ConfigService
  ) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connexion utilisateur' })
  @ApiResponse({ status: 200, description: 'Connexion réussie' })
  @ApiResponse({ status: 401, description: 'Identifiants invalides' })
  async login(@Request() req, @Body() loginDto: LoginDto) {
    return this.authService.login(req.user);
  }

  @Post('register')
  @ApiOperation({ summary: 'Inscription d\'un nouvel utilisateur' })
  @ApiResponse({ status: 201, description: 'Utilisateur créé avec succès' })
  @ApiResponse({ status: 409, description: 'Email, username ou téléphone déjà utilisé' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rafraîchir le token JWT' })
  @ApiResponse({ status: 200, description: 'Token rafraîchi avec succès' })
  @ApiResponse({ status: 401, description: 'Token de rafraîchissement invalide' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Post('verify-2fa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Vérifier le code 2FA' })
  @ApiResponse({ status: 200, description: 'Code 2FA validé avec succès' })
  @ApiResponse({ status: 401, description: 'Code 2FA invalide' })
  async verifyTwoFactor(@Body() verifyTwoFactorDto: VerifyTwoFactorDto) {
    return this.authService.verifyTwoFactor(
      verifyTwoFactorDto.userId,
      verifyTwoFactorDto.code,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Déconnexion utilisateur' })
  @ApiResponse({ status: 200, description: 'Déconnexion réussie' })
  @ApiBearerAuth()
  async logout(@Request() req, @Body() body: { refreshToken: string }) {
    return this.authService.logout(req.user.id, body.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('enable-2fa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activer l\'authentification à deux facteurs' })
  @ApiResponse({ status: 200, description: 'Préparation de l\'activation 2FA réussie' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  @ApiBearerAuth()
  async enableTwoFactor(@Request() req) {
    return this.authService.enableTwoFactor(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('confirm-2fa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirmer l\'activation de l\'authentification à deux facteurs' })
  @ApiResponse({ status: 200, description: 'Activation 2FA réussie' })
  @ApiResponse({ status: 401, description: 'Code invalide' })
  @ApiBearerAuth()
  async confirmTwoFactorEnable(@Request() req, @Body() body: TwoFactorCodeDto) {
    return this.authService.confirmTwoFactorEnable(req.user.id, body.code);
  }

  @UseGuards(JwtAuthGuard)
  @Post('disable-2fa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Désactiver l\'authentification à deux facteurs' })
  @ApiResponse({ status: 200, description: 'Désactivation 2FA réussie' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  @ApiBearerAuth()
  async disableTwoFactor(@Request() req) {
    return this.authService.disableTwoFactor(req.user.id);
  }

@Post('forgot-password')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Demande de réinitialisation de mot de passe' })
  @ApiResponse({ 
    status: 202,
    description: 'Requête acceptée (email envoyé si l\'utilisateur existe)' 
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    try {
      console.log('🔍 [BACKEND] Forgot password pour:', forgotPasswordDto.email);
      
      await this.authService.sendPasswordResetEmail(forgotPasswordDto.email);
      
      return { 
        message: 'Si cet email est associé à un compte, un lien de réinitialisation a été envoyé'
      };
    } catch (error) {
      console.error('❌ [BACKEND] Erreur forgot-password:', error);
      
      throw new BadRequestException(
        'Une erreur est survenue lors du traitement de votre demande'
      );
    }
  }

   @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Réinitialisation du mot de passe' })
  @ApiResponse({ 
    status: 200, 
    description: 'Mot de passe réinitialisé avec succès',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Token invalide ou expiré' 
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    try {
      console.log('🔍 [BACKEND] Reset password avec token:', resetPasswordDto.token?.substring(0, 10) + '...');
      
      await this.authService.resetPassword(
        resetPasswordDto.token,
        resetPasswordDto.newPassword
      );
      
      console.log('✅ [BACKEND] Mot de passe réinitialisé avec succès');
      
      return { 
        message: 'Mot de passe réinitialisé avec succès',
        success: true 
      };
    } catch (error) {
      console.error('❌ [BACKEND] Erreur reset-password:', error);
      
      throw new BadRequestException(
        error.message || 'Erreur lors de la réinitialisation du mot de passe'
      );
    }
  }

   @Get('validate-reset-token')
  @ApiOperation({ summary: 'Valider un token de réinitialisation (API)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Token validé', 
    schema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean' }
      }
    }
  })
  async validateResetTokenAPI(@Query('token') token: string) {
    try {
      console.log('🔍 [BACKEND] Validation token:', token?.substring(0, 10) + '...');
      
      if (!token) {
        return { valid: false };
      }
      
      const isValid = await this.authService.validateResetToken(token);
      console.log('🔍 [BACKEND] Token valide:', isValid);
      
      return { valid: isValid };
    } catch (error) {
      console.error('❌ [BACKEND] Erreur validation:', error);
      return { valid: false };
    }
  }


 @Get('reset-link')
  @ApiOperation({ summary: 'Gérer les liens depuis les emails (avec redirection)' })
  @Redirect()
  async handleEmailResetLink(@Query('token') token: string) {
    const frontendUrl = this.configService.get('FRONTEND_URL') || 
                       this.configService.get('APP_FRONTEND_URL') || 
                       'http://localhost:4200';
    
    console.log('🔍 [BACKEND] Gestion lien email, token:', token?.substring(0, 10) + '...');
    console.log('🔍 [BACKEND] Frontend URL:', frontendUrl);
    
    if (!token) {
      return { url: `${frontendUrl}/login?error=missing-token` };
    }
    
    try {
      const isValid = await this.authService.validateResetToken(token);
      
      if (!isValid) {
        return { url: `${frontendUrl}/login?error=invalid-token` };
      }
      
      return { url: `${frontendUrl}/reset-password?token=${token}` };
    } catch (error) {
      console.error('❌ [BACKEND] Erreur lien email:', error);
      return { url: `${frontendUrl}/login?error=server-error` };
    }
  }
}