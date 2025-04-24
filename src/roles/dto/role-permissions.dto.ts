import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsNotEmpty, IsString } from "class-validator";

/**
 * DTO pour l'ajout de plusieurs permissions à un rôle
 */
export class RolePermissionsDto {
    /**
     * Liste des identifiants des permissions à ajouter
     * @example ["60d21b4667d0d8992e610c85", "60d21b4667d0d8992e610c86"]
     */
    @ApiProperty({
      description: 'Liste des identifiants des permissions à ajouter',
      example: ['60d21b4667d0d8992e610c85', '60d21b4667d0d8992e610c86'],
      required: true,
      type: [String]
    })
    @IsArray()
    @IsString({ each: true })
    @IsNotEmpty({ each: true })
    permissionIds: string[];
  }