import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsDateString, IsUUID } from 'class-validator';

export class CreateTaskDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  dueStart: Date;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  dueEnd?: Date;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  startDate?: Date;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  endDate?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  estimatedHours?: number;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  statusId: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  priorityId: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  timelineId?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  createdById?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsUUID('all', { each: true })
  @IsOptional()
  assigneeIds?: string[];
}