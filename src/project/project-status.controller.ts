import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { ProjectStatusService } from './project-status.service';
import { CreateProjectStatusDto } from './dto/create-project-status.dto';
import { ProjectStatusFilterDto } from './dto/project-status-filter.dto';


@Controller('project-status')
export class ProjectStatusController {
  constructor(private readonly projectStatusService: ProjectStatusService) {}

  @Post()
  async create(@Body() createProjectStatusDto: CreateProjectStatusDto) {
    return this.projectStatusService.create(createProjectStatusDto);
  }

  @Get()
  async findAll(@Query() filters?: ProjectStatusFilterDto) {
    return this.projectStatusService.findAll(filters);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.projectStatusService.findOne(id);
  }
}