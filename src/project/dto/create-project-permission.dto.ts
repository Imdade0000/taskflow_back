// dto/create-project-permission.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength, Matches } from 'class-validator';

export class CreateProjectPermissionDto {
  @ApiProperty({
    description: 'Nom de la permission de projet',
    example: 'Gérer les tâches',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Slug unique de la permission (format: module.action)',
    example: 'project.tasks.manage',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)*$/, {
    message: 'Le slug doit être au format snake_case ou point.notation (ex: project.tasks.manage)',
  })
  slug: string;

  @ApiProperty({
    description: 'Description de la permission de projet',
    example: 'Permet de créer, modifier et supprimer les tâches du projet',
    required: false,
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}