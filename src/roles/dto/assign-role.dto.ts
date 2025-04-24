import { ApiProperty } from "@nestjs/swagger"
import { IsNotEmpty, IsString } from "class-validator"

/**
 * DTO pour l'assignation d'un rôle à un utilisateur
 */
export class AssignRoleDto {
  /**
   * Identifiant unique du rôle à assigner
   * @example "60d21b4667d0d8992e610c87"
   */
  @ApiProperty({
    description: 'Identifiant unique du rôle à assigner',
    example: '60d21b4667d0d8992e610c87',
    required: true
  })
  @IsString()
  @IsNotEmpty()
  roleId: string;
}