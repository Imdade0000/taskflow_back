import { IsString, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyTwoFactorDto {
  @ApiProperty({
    description: 'Code de vérification à deux facteurs (6 chiffres)',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty({ message: 'Le code 2FA est requis' })
  @Length(6, 6, { message: 'Le code 2FA doit contenir exactement 6 caractères' })
  code: string;

  @ApiProperty({
    description: 'ID de l\'utilisateur à authentifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty({ message: 'L\'ID utilisateur est requis' })
  userId: string;
}