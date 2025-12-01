// dto/project-role-permissions.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsUUID, ArrayMinSize } from 'class-validator';

export class ProjectRolePermissionsDto {
  @ApiProperty({
    description: 'Liste des IDs des permissions de projet',
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '456e7890-e89b-12d3-a456-426614174001'
    ],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsUUID(undefined, { each: true })
  projectPermissionIds: string[];
}