import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProjectStatusDto } from './dto/create-project-status.dto';
import { ProjectStatusFilterDto } from './dto/project-status-filter.dto';

@Injectable()
export class ProjectStatusService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createProjectStatusDto: CreateProjectStatusDto) {
    return this.prisma.projectStatus.create({
      data: createProjectStatusDto,
    });
  }

  async findAll(filter?: ProjectStatusFilterDto) {
    return this.prisma.projectStatus.findMany({
      where: {
        // Ajoutez ici les conditions de filtrage si nécessaire
        name: filter?.name, // Exemple de filtre
        // ... autres filtres possibles
      },
      orderBy: {
        createdAt: 'desc', // Tri par défaut
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.projectStatus.findUnique({
      where: { id },
    });
  }

  // Méthode bonus pour la mise à jour
  async update(id: string, updateData: Partial<CreateProjectStatusDto>) {
    return this.prisma.projectStatus.update({
      where: { id },
      data: updateData,
    });
  }

  // Méthode bonus pour la suppression
  async remove(id: string) {
    return this.prisma.projectStatus.delete({
      where: { id },
    });
  }
}