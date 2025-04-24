// update-two-factor.dto.ts

import { IsOptional, IsString, IsDate } from 'class-validator';
import { UpdateUserDto } from './updateUserDto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTwoFactorDto extends UpdateUserDto {
  @ApiPropertyOptional({
    description: 'Code de vérification à deux facteurs (optionnel)',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Le code de vérification doit être une chaîne de caractères' })
  twoFactorCode?: string | null;
  
  @ApiPropertyOptional({
    description: 'Date d\'expiration du code de vérification à deux facteurs (optionnel)',
    type: Date,
    required: false,
  })
  @IsOptional()
  @IsDate({ message: 'La date d\'expiration doit être une date valide' })
  twoFactorExpiry?: Date | null;
}
