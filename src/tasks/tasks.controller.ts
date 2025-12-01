// tasks.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskStatusDto } from 'src/task-status/dto/create-task-status.dto';
import { UpdateTaskStatusDto } from 'src/task-status/dto/update-task-status.dto';
import { CreateTimelineDto } from 'src/timeline/dto/create-timeline.dto';
import { UpdateTimelineDto } from 'src/timeline/dto/update-timeline.dto';
import { CreateTaskPriorityDto } from 'src/task-priority/dto/create-task-priority.dto';
import { UpdateTaskPriorityDto } from 'src/task-priority/dto/update-task-priority.dto';


@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // Routes pour les données de référence (DOIVENT être avant :id)
  @Get('task-priorities')
  getTaskPriorities() {
    return this.tasksService.getTaskPriorities();
  }

  @Get('task-statuses')
  getTaskStatuses() {
    return this.tasksService.getTaskStatuses();
  }

  @Get('projects')
  getProjects() {
    return this.tasksService.getProjects();
  }

  @Get('timelines')
  getTimelines() {
    return this.tasksService.getTimelines();
  }

  @Get('members')
  getMembers() {
    return this.tasksService.getMembers();
  }

  // Route pour obtenir toutes les tâches avec filtres
  @Get()
  findAll(@Query() filters: any) {
    return this.tasksService.findAll(filters);
  }

  // Route pour obtenir une tâche spécifique (DOIT être après les routes spécifiques)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  // CRUD Operations
  @Post()
  create(@Body() createTaskDto: any) {
    return this.tasksService.create(createTaskDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTaskDto: any) {
    return this.tasksService.update(id, updateTaskDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tasksService.remove(id);
  }

  // ==================== TASK STATUS ROUTES ====================

@Post('task-statuses')
createTaskStatus(@Body() createTaskStatusDto: CreateTaskStatusDto) {
  return this.tasksService.createTaskStatus(createTaskStatusDto);
}

@Get('task-statuses/:id')
getTaskStatus(@Param('id') id: string) {
  return this.tasksService.findOneTaskStatus(id);
}

@Patch('task-statuses/:id')
updateTaskStatus(@Param('id') id: string, @Body() updateTaskStatusDto: UpdateTaskStatusDto) {
  return this.tasksService.updateTaskStatus(id, updateTaskStatusDto);
}

@Delete('task-statuses/:id')
removeTaskStatus(@Param('id') id: string) {
  return this.tasksService.removeTaskStatus(id);
}

// ==================== TIMELINE ROUTES ====================

@Post('timelines')
createTimeline(@Body() createTimelineDto: CreateTimelineDto) {
  return this.tasksService.createTimeline(createTimelineDto);
}

@Get('timelines/:id')
getTimeline(@Param('id') id: string) {
  return this.tasksService.findOneTimeline(id);
}

@Patch('timelines/:id')
updateTimeline(@Param('id') id: string, @Body() updateTimelineDto: UpdateTimelineDto) {
  return this.tasksService.updateTimeline(id, updateTimelineDto);
}

@Delete('timelines/:id')
removeTimeline(@Param('id') id: string) {
  return this.tasksService.removeTimeline(id);
}

// ==================== TASK PRIORITY ROUTES ====================

@Post('task-priorities')
createTaskPriority(@Body() createTaskPriorityDto: CreateTaskPriorityDto) {
  return this.tasksService.createTaskPriority(createTaskPriorityDto);
}

@Get('task-priorities/:id')
getTaskPriority(@Param('id') id: string) {
  return this.tasksService.findOneTaskPriority(id);
}

@Patch('task-priorities/:id')
updateTaskPriority(@Param('id') id: string, @Body() updateTaskPriorityDto: UpdateTaskPriorityDto) {
  return this.tasksService.updateTaskPriority(id, updateTaskPriorityDto);
}

@Delete('task-priorities/:id')
removeTaskPriority(@Param('id') id: string) {
  return this.tasksService.removeTaskPriority(id);
}
}