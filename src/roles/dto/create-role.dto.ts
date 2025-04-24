import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

/**
 * DTO pour la création d'un rôle
 */
export class CreateRoleDto {
  /**
   * Nom unique du rôle
   * @example "admin"
   */
  @ApiProperty({
    description: 'Nom unique du rôle',
    example: 'admin',
    required: true
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  /**
   * Description détaillée du rôle (optionnelle)
   * @example "Administrateur avec tous les droits"
   */
  @ApiProperty({
    description: 'Description détaillée du rôle',
    example: 'Administrateur avec tous les droits',
    required: false
  })
  @IsString()
  @IsOptional()
  description?: string;

  /**
   * Indique si le rôle a toutes les permissions
   */
  @ApiProperty({
    description: 'Indique si le rôle a automatiquement toutes les permissions',
    example: false,
    required: false,
    default: false
  })
  @IsBoolean()
  @IsOptional()
  hasAllPermissions?: boolean;
}
