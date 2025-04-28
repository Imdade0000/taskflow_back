import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UsePipes,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { ProjectFiltersDto } from './dto/project-filters.dto';

@ApiTags('Projects')
@ApiBearerAuth()
@Controller('projects')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  @ApiOperation({ summary: 'Create new project' })
  @ApiResponse({ status: 201, description: 'Project created successfully' })
  async create(@Body() createProjectDto: CreateProjectDto) {
    return this.projectService.create(createProjectDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all projects with filters' })
  async findAll(@Query() filters: ProjectFiltersDto) {
    return this.projectService.findAll(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update project' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    return this.projectService.update(id, updateProjectDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete project' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectService.remove(id);
  }

  @Patch(':id/archive')
  @ApiOperation({ summary: 'Archive project' })
  async archive(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectService.archive(id);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore archived project' })
  async restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectService.restore(id);
  }
}