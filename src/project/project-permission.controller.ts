import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ProjectPermissionService } from './project-permission.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermissions } from '../permissions/decorator/require-permissions.decorator';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam, 
  ApiBody, 
  ApiBearerAuth 
} from '@nestjs/swagger';
import { CreateProjectPermissionDto } from './dto/create-project-permission.dto';
import { UpdateProjectPermissionDto } from './dto/update-project-permission.dto';

@ApiTags('Project Permissions')
@ApiBearerAuth()
@Controller('projects-permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProjectPermissionController {
  constructor(private readonly projectPermissionService: ProjectPermissionService) {}

  @Get()
  @RequirePermissions('projects_permissions.list')
  @ApiOperation({ 
    summary: 'Récupérer toutes les permissions de projet',
    description: 'Récupère la liste complète des permissions disponibles pour les projets'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Liste des permissions de projet récupérée avec succès'
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Non autorisé - JWT manquant ou invalide'
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Accès refusé - Permission requise manquante'
  })
  async findAll() {
    return await this.projectPermissionService.findAll();
  }

  @Get(':id')
  @RequirePermissions('projects_permissions.view')
  @ApiOperation({ 
    summary: 'Récupérer une permission de projet par ID',
    description: 'Récupère les détails d\'une permission de projet spécifique'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'ID unique de la permission de projet'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Permission de projet trouvée avec succès'
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Permission de projet non trouvée'
  })
  async findOne(@Param('id') id: string) {
    return await this.projectPermissionService.findById(id);
  }

  @Get('slug/:slug')
  @RequirePermissions('projects_permissions.view')
  @ApiOperation({ 
    summary: 'Récupérer une permission de projet par slug',
    description: 'Récupère une permission de projet par son slug unique'
  })
  @ApiParam({ 
    name: 'slug', 
    description: 'Slug unique de la permission de projet'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Permission de projet trouvée avec succès'
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Permission de projet non trouvée'
  })
  async findBySlug(@Param('slug') slug: string) {
    return await this.projectPermissionService.findBySlug(slug);
  }

  @Post()
  @RequirePermissions('projects_permissions.create')
  @ApiOperation({ 
    summary: 'Créer une nouvelle permission de projet',
    description: 'Crée une nouvelle permission pour les projets'
  })
  @ApiBody({ 
    type: CreateProjectPermissionDto,
    description: 'Données de la permission de projet à créer'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Permission de projet créée avec succès'
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Requête invalide - Données invalides ou manquantes'
  })
  @ApiResponse({ 
    status: 409, 
    description: 'Conflit - Une permission avec ce slug existe déjà'
  })
  async create(@Body() createProjectPermissionDto: CreateProjectPermissionDto) {
    return await this.projectPermissionService.create(createProjectPermissionDto);
  }

  @Put(':id')
  @RequirePermissions('projects_permissions.update')
  @ApiOperation({ 
    summary: 'Mettre à jour une permission de projet',
    description: 'Modifie les détails d\'une permission de projet existante'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'ID unique de la permission de projet à mettre à jour'
  })
  @ApiBody({ 
    type: UpdateProjectPermissionDto,
    description: 'Données de mise à jour de la permission'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Permission de projet mise à jour avec succès'
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Requête invalide - Données invalides'
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Permission de projet non trouvée'
  })
  @ApiResponse({ 
    status: 409, 
    description: 'Conflit - Une permission avec ce slug existe déjà'
  })
  async update(
    @Param('id') id: string,
    @Body() updateProjectPermissionDto: UpdateProjectPermissionDto,
  ) {
    return await this.projectPermissionService.update(id, updateProjectPermissionDto);
  }

  @Delete(':id')
  @RequirePermissions('projects_permissions.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ 
    summary: 'Supprimer une permission de projet',
    description: 'Supprime une permission de projet du système'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'ID unique de la permission de projet à supprimer'
  })
  @ApiResponse({ 
    status: 204, 
    description: 'Permission de projet supprimée avec succès'
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Permission de projet non trouvée'
  })
  async remove(@Param('id') id: string) {
    await this.projectPermissionService.delete(id);
  }

  @Get('user/:userId/project/:projectId')
  @RequirePermissions('projects_permissions.list')
  @ApiOperation({ 
    summary: 'Récupérer les permissions de projet d\'un utilisateur',
    description: 'Récupère toutes les permissions qu\'un utilisateur a sur un projet spécifique'
  })
  @ApiParam({ 
    name: 'userId', 
    description: 'ID unique de l\'utilisateur'
  })
  @ApiParam({ 
    name: 'projectId', 
    description: 'ID unique du projet'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Permissions de l\'utilisateur récupérées avec succès'
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Utilisateur ou projet non trouvé'
  })
  async getUserProjectPermissions(
    @Param('userId') userId: string,
    @Param('projectId') projectId: string,
  ) {
    return await this.projectPermissionService.getUserProjectPermissions(userId, projectId);
  }

  @Post('seed-defaults')
  @RequirePermissions('projects_permissions.create')
  @ApiOperation({ 
    summary: 'Initialiser les permissions de projet par défaut',
    description: 'Crée les permissions de projet standard nécessaires au système'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Permissions par défaut créées avec succès'
  })
  async seedDefaultPermissions() {
    return await this.projectPermissionService.seedDefaultPermissions();
  }
}