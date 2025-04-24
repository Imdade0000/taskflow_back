import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

/**
 * DTO pour l'ajout d'une permission à un rôle
 */
export class RolePermissionDto {
    /**
     * Identifiant unique de la permission à ajouter
     * @example "60d21b4667d0d8992e610c85"
     */
    @ApiProperty({
      description: 'Identifiant unique de la permission à ajouter',
      example: '60d21b4667d0d8992e610c85',
      required: true
    })
    @IsString()
    @IsNotEmpty()
    permissionId: string;
  }
  