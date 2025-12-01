// Créez ou vérifiez votre dto/reset-password.dto.ts

import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Token de réinitialisation',
    example: 'abc123def456ghi789'
  })
  @IsNotEmpty({ message: 'Le token est obligatoire' })
  @IsString({ message: 'Le token doit être une chaîne de caractères' })
  token: string;

  @ApiProperty({
    description: 'Nouveau mot de passe',
    example: 'MonNouveauMotDePasse123!',
    minLength: 8
  })
  @IsNotEmpty({ message: 'Le nouveau mot de passe est obligatoire' })
  @IsString({ message: 'Le nouveau mot de passe doit être une chaîne de caractères' })
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  newPassword: string;
}