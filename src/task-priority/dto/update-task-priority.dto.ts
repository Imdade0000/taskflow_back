// dto/update-task-priority.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateTaskPriorityDto } from './create-task-priority.dto';

export class UpdateTaskPriorityDto extends PartialType(CreateTaskPriorityDto) {}