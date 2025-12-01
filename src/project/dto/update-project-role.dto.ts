// dto/update-project-role.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateProjectRoleDto {
  @ApiProperty({
    description: 'Nom du rôle de projet',
    example: 'Chef de projet senior',
    required: false,
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiProperty({
    description: 'Description du rôle de projet',
    example: 'Responsable senior de la coordination et du suivi du projet',
    required: false,
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}