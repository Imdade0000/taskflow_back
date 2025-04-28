import { Controller, Post, Body } from '@nestjs/common';
import { ProjectStatusService } from './project-status.service';
import { CreateProjectStatusDto } from './dto/create-project-status.dto';

@Controller('project-status')
export class ProjectStatusController {
  constructor(private readonly projectStatusService: ProjectStatusService) {}

  @Post()
  async create(@Body() createProjectStatusDto: CreateProjectStatusDto) {
    return this.projectStatusService.create(createProjectStatusDto);
  }
}
