import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length } from 'class-validator';

export class TwoFactorCodeDto {
  @ApiProperty({ description: 'Code à 6 chiffres pour l\'authentification à deux facteurs' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'Le code doit contenir exactement 6 chiffres' })
  code: string;
}