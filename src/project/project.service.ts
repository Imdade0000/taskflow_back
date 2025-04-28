import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectFiltersDto } from './dto/project-filters.dto';
import { Prisma } from '@prisma/client';


@Injectable()
export class ProjectService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createProjectDto: CreateProjectDto) {
    await this.validateProjectRelations(createProjectDto);

    const project = await this.prisma.project.create({
      data: {
        name: createProjectDto.name,
        description: createProjectDto.description,
        startDate: createProjectDto.startDate,
        dueStart: createProjectDto.dueStart,
        endDate: createProjectDto.endDate,
        dueEnd: createProjectDto.dueEnd,
        status: { connect: { id: createProjectDto.projectStatusId } },
      },
    });

    await this.addCreatorAsMember(project.id, createProjectDto.userId);

    return this.findOne(project.id);
  }

  async findAll(filters: ProjectFiltersDto) {
    const where: Prisma.ProjectWhereInput = {
      isArchived: filters.isArchived,
      projectStatusId: filters.statusId,
    };
  
    if (filters.search) {
      where.name = {
        contains: filters.search,
      };
    }
  
    return this.prisma.project.findMany({
      where,
      include: this.getDefaultIncludes(),
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: this.getFullIncludes(),
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return project;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    if (updateProjectDto.projectStatusId) {
      await this.validateStatus(updateProjectDto.projectStatusId);
    }

    return this.prisma.project.update({
      where: { id },
      data: {
        name: updateProjectDto.name,
        description: updateProjectDto.description,
        startDate: updateProjectDto.startDate,
        dueStart: updateProjectDto.dueStart,
        endDate: updateProjectDto.endDate,
        dueEnd: updateProjectDto.dueEnd,
        ...(updateProjectDto.projectStatusId && {
          status: { connect: { id: updateProjectDto.projectStatusId } },
        }),
      },
      include: this.getDefaultIncludes(),
    });
  }

  async remove(id: string) {
    await this.validateProjectExists(id);
    
    return this.prisma.project.delete({
      where: { id },
      include: { members: true },
    });
  }

  async archive(id: string) {
    return this.toggleArchive(id, true);
  }

  async restore(id: string) {
    return this.toggleArchive(id, false);
  }

  // Helper methods
  private async validateProjectRelations(dto: CreateProjectDto) {
    const [status, user] = await Promise.all([
      this.prisma.projectStatus.findUnique({
        where: { id: dto.projectStatusId },
      }),
      this.prisma.user.findUnique({ where: { id: dto.userId } }),
    ]);

    if (!status) throw new NotFoundException('Project status not found');
    if (!user) throw new NotFoundException('User not found');
  }

  private async addCreatorAsMember(projectId: string, userId: string) {
    const defaultRole = await this.getOrCreateDefaultRole();
    
    try {
      await this.prisma.projectMember.create({
        data: {
          userId,
          projectId,
          projectRoleId: defaultRole.id,
        },
      });
    } catch (error) {
      throw new ConflictException('User is already a project member');
    }
  }

  private async getOrCreateDefaultRole() {
    let role = await this.prisma.projectRole.findFirst({
      where: { name: 'Member' },
    });

    if (!role) {
      role = await this.prisma.projectRole.create({
        data: {
          name: 'Member',
          description: 'Default project member role',
        },
      });
    }

    return role;
  }

  private getDefaultIncludes() {
    return {
      status: true,
      members: {
        include: {
          user: true,
          projectRole: true,
        },
      },
    };
  }

  private getFullIncludes() {
    return {
      ...this.getDefaultIncludes(),
      tasks: true,
      timelines: true,
      tags: {
        include: {
          tag: true,
        },
      },
      documents: true,
    };
  }

  private async validateProjectExists(id: string) {
    const exists = await this.prisma.project.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
  }

  private async validateStatus(statusId: string) {
    const status = await this.prisma.projectStatus.findUnique({
      where: { id: statusId },
    });
    if (!status) {
      throw new NotFoundException('Project status not found');
    }
  }

  private async toggleArchive(id: string, isArchived: boolean) {
    await this.validateProjectExists(id);

    return this.prisma.project.update({
      where: { id },
      data: {
        isArchived,
        archivedAt: isArchived ? new Date() : null,
      },
      include: this.getDefaultIncludes(),
    });
  }
}