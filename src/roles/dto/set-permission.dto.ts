import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean } from "class-validator";

/**
 * DTO pour définir si un rôle a toutes les permissions
 */
export class SetAllPermissionsDto {
    /**
     * Indique si le rôle doit avoir toutes les permissions
     * @example true
     */
    @ApiProperty({
      description: 'Indique si le rôle doit avoir toutes les permissions',
      example: true,
      required: true
    })
    @IsBoolean()
    value: boolean;
  }