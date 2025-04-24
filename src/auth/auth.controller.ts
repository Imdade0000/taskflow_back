import { Controller, Post, Body, UseGuards, Request, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { VerifyTwoFactorDto } from './strategies/verify-two-factor.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { TwoFactorCodeDto } from './dto/two-factor-code.dto'; 
 
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
 
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
}