// dto/notification-types.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsUUID, IsDateString, IsNumber, IsEnum } from 'class-validator';

export class TaskAssignmentNotificationDto {
  @ApiProperty({
    description: 'IDs des membres du projet assignés',
    example: ['uuid1', 'uuid2']
  })
  @IsArray()
  @IsUUID('4', { each: true })
  assignedUserIds: string[];

  @ApiProperty({
    description: 'Titre de la tâche',
    example: 'Développer la nouvelle fonctionnalité'
  })
  @IsString()
  taskTitle: string;

  @ApiProperty({
    description: 'ID de la tâche',
    example: 'task-uuid'
  })
  @IsString()
  @IsUUID()
  taskId: string;
}

export class TaskCompletedNotificationDto {
  @ApiProperty({
    description: 'IDs des membres du projet à notifier',
    example: ['uuid1', 'uuid2']
  })
  @IsArray()
  @IsUUID('4', { each: true })
  projectMemberIds: string[];

  @ApiProperty({
    description: 'Titre de la tâche',
    example: 'Développer la nouvelle fonctionnalité'
  })
  @IsString()
  taskTitle: string;

  @ApiProperty({
    description: 'ID de la tâche',
    example: 'task-uuid'
  })
  @IsString()
  @IsUUID()
  taskId: string;

  @ApiProperty({
    description: 'ID de l\'utilisateur qui a terminé la tâche',
    example: 'user-uuid',
    required: false
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  completedByUserId?: string;
}

export class TaskCommentNotificationDto {
  @ApiProperty({
    description: 'ID de la tâche',
    example: 'task-uuid'
  })
  @IsString()
  @IsUUID()
  taskId: string;

  @ApiProperty({
    description: 'Titre de la tâche',
    example: 'Développer la nouvelle fonctionnalité'
  })
  @IsString()
  taskTitle: string;

  @ApiProperty({
    description: 'Contenu du commentaire',
    example: 'J\'ai terminé la première partie de cette tâche'
  })
  @IsString()
  commentContent: string;

  @ApiProperty({
    description: 'ID de l\'auteur du commentaire',
    example: 'user-uuid'
  })
  @IsString()
  @IsUUID()
  commentAuthorId: string;

  @ApiProperty({
    description: 'IDs des membres du projet assignés à la tâche',
    example: ['uuid1', 'uuid2']
  })
  @IsArray()
  @IsUUID('4', { each: true })
  assignedProjectMemberIds: string[];
}

export class TaskReminderNotificationDto {
  @ApiProperty({
    description: 'IDs des membres du projet assignés',
    example: ['uuid1', 'uuid2']
  })
  @IsArray()
  @IsUUID('4', { each: true })
  assignedProjectMemberIds: string[];

  @ApiProperty({
    description: 'Titre de la tâche',
    example: 'Développer la nouvelle fonctionnalité'
  })
  @IsString()
  taskTitle: string;

  @ApiProperty({
    description: 'ID de la tâche',
    example: 'task-uuid'
  })
  @IsString()
  @IsUUID()
  taskId: string;

  @ApiProperty({
    description: 'Type de rappel',
    enum: ['DUE_SOON', 'OVERDUE'],
    example: 'DUE_SOON',
    required: false
  })
  @IsOptional()
  @IsEnum(['DUE_SOON', 'OVERDUE'])
  reminderType?: 'DUE_SOON' | 'OVERDUE';
}

export class DeadlineReminderNotificationDto {
  @ApiProperty({
    description: 'IDs des membres du projet',
    example: ['uuid1', 'uuid2']
  })
  @IsArray()
  @IsUUID('4', { each: true })
  projectMemberIds: string[];

  @ApiProperty({
    description: 'Titre de la tâche',
    example: 'Développer la nouvelle fonctionnalité'
  })
  @IsString()
  taskTitle: string;

  @ApiProperty({
    description: 'ID de la tâche',
    example: 'task-uuid'
  })
  @IsString()
  @IsUUID()
  taskId: string;

  @ApiProperty({
    description: 'Date d\'échéance',
    example: '2024-12-31T23:59:59Z'
  })
  @IsDateString()
  dueDate: string;

  @ApiProperty({
    description: 'Nombre d\'heures jusqu\'à l\'échéance',
    example: 24
  })
  @IsNumber()
  hoursUntilDeadline: number;
}

export class ProjectUpdateNotificationDto {
  @ApiProperty({
    description: 'ID du projet',
    example: 'project-uuid'
  })
  @IsString()
  @IsUUID()
  projectId: string;

  @ApiProperty({
    description: 'Nom du projet',
    example: 'Projet de développement web'
  })
  @IsString()
  projectName: string;

  @ApiProperty({
    description: 'Message de mise à jour',
    example: 'Le projet a été mis à jour avec de nouvelles fonctionnalités'
  })
  @IsString()
  updateMessage: string;

  @ApiProperty({
    description: 'ID de l\'utilisateur qui a fait la mise à jour',
    example: 'user-uuid',
    required: false
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  updatedByUserId?: string;
}

export class AddTaskCommentDto {
  @ApiProperty({
    description: 'Contenu du commentaire',
    example: 'Voici un commentaire sur cette tâche'
  })
  @IsString()
  content: string;

  @ApiProperty({
    description: 'ID de l\'auteur du commentaire',
    example: 'user-uuid'
  })
  @IsString()
  @IsUUID()
  authorId: string;
}