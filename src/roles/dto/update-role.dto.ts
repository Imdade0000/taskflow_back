import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString } from "class-validator";

/**
 * DTO pour la mise à jour d'un rôle
 */
export class UpdateRoleDto {
    /**
     * Nouveau nom du rôle (optionnel)
     * @example "super_admin"
     */
    @ApiProperty({
      description: 'Nouveau nom du rôle',
      example: 'super_admin',
      required: false
    })
    @IsString()
    @IsOptional()
    name?: string;
  
    /**
     * Nouvelle description du rôle (optionnelle)
     * @example "Super administrateur avec droits étendus"
     */
    @ApiProperty({
      description: 'Nouvelle description du rôle',
      example: 'Super administrateur avec droits étendus',
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
      required: false
    })
    @IsBoolean()
    @IsOptional()
    hasAllPermissions?: boolean;
  }
  