// dto/project-role-permission.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class ProjectRolePermissionDto {
  @ApiProperty({
    description: 'ID de la permission de projet à associer au rôle',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  projectPermissionId: string;
}