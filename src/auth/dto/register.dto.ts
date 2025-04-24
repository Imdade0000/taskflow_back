import { IsString, IsEmail, IsOptional, MinLength, IsUUID, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ description: 'Prénom de l\'utilisateur' })
  @IsString()
  firstname: string;

  @ApiProperty({ description: 'Nom de l\'utilisateur' })
  @IsString()
  lastname: string;

  @ApiProperty({ description: 'Nom d\'utilisateur unique' })
  @IsString()
  username: string;

  @ApiProperty({ description: 'Email unique de l\'utilisateur' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'Numéro de téléphone unique (optionnel)' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'Mot de passe (minimum 8 caractères)' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ description: 'ID du département (optionnel)' })
  @IsOptional()
  @IsUUID()
  departementId?: string;

  @ApiProperty({ description: 'ID du rôle' })
  @IsUUID()
  roleId: string;

  @ApiPropertyOptional({ description: 'Activer la double authentification (par défaut: true)' })
  @IsOptional()
  @IsBoolean()
  twoFactorEnabled?: boolean;
}