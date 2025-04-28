import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProjectStatusDto } from './dto/create-project-status.dto';

@Injectable()
export class ProjectStatusService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createProjectStatusDto: CreateProjectStatusDto) {
    return this.prisma.projectStatus.create({
      data: createProjectStatusDto,
    });
  }
}
