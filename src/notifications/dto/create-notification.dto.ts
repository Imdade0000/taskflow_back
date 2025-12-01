// dto/create-notification.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsUUID, IsEnum } from 'class-validator';

export enum NotificationType {
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  TASK_COMPLETED = 'TASK_COMPLETED',
  TASK_COMMENT = 'TASK_COMMENT',
  DEADLINE_REMINDER = 'DEADLINE_REMINDER',
  PROJECT_UPDATE = 'PROJECT_UPDATE',
  TASK_REMINDER = 'TASK_REMINDER',
  GENERAL = 'GENERAL'
}

export class CreateNotificationDto {
  @ApiProperty({
    description: 'ID de l\'utilisateur destinataire',
    example: 'user-uuid'
  })
  @IsString()
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: 'Titre de la notification',
    example: 'Nouvelle tâche assignée'
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Contenu de la notification',
    example: 'Vous avez été assigné à la tâche "Développer la nouvelle fonctionnalité"'
  })
  @IsString()
  content: string;

  @ApiProperty({
    description: 'Type de notification',
    enum: NotificationType,
    example: NotificationType.TASK_ASSIGNED
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({
    description: 'Statut de lecture',
    example: false,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @ApiProperty({
    description: 'ID de la tâche liée (optionnel)',
    example: 'task-uuid',
    required: false
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  taskId?: string;

  @ApiProperty({
    description: 'ID du projet lié (optionnel)',
    example: 'project-uuid',
    required: false
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  projectId?: string;

  @ApiProperty({
    description: 'Données supplémentaires (JSON)',
    example: '{"key": "value"}',
    required: false
  })
  @IsOptional()
  @IsString()
  metadata?: string;
}