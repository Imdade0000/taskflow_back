import { IsString, IsNotEmpty, Length, Matches, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VerifyTwoFactorDto {
  @ApiProperty({
    description: "ID de l'utilisateur (UUID ou identifiant unique)",
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty({ message: 'L\'ID utilisateur est requis' })
  userId: string;

  @ApiProperty({
    description: 'Code de vérification à 6 chiffres envoyé à l’utilisateur',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty({ message: 'Le code de vérification est requis' })
  @Matches(/^\d{6}$/, {
    message: 'Le code doit contenir exactement 6 chiffres',
  })
  code: string;

  @ApiPropertyOptional({
    description: 'Jeton temporaire à usage unique (facultatif, utilisé selon le contexte)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsOptional()
  @IsString()
  tempToken?: string;

  @IsOptional()
  @IsString()
  context?: string;
}
