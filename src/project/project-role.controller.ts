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
import { ProjectRoleService} from './Project-role.service';
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
import { CreateProjectRoleDto } from './dto/create-project-role.dto';
import { UpdateProjectRoleDto } from './dto/update-project-role.dto';
import { ProjectRolePermissionDto } from './dto/project-role-permission.dto';
import { ProjectRolePermissionsDto } from './dto/project-role-permissions.dto';

@ApiTags('Project Roles')
@ApiBearerAuth()
@Controller('project-roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProjectRoleController {
  constructor(private readonly projectRoleService: ProjectRoleService) {}

  @Get()
  @RequirePermissions('project_roles.list')
  @ApiOperation({ 
    summary: 'Récupérer tous les rôles de projet',
    description: 'Récupère la liste complète des rôles disponibles pour les projets'
  })
  @ApiResponse({ status: 200, description: 'Liste des rôles de projet récupérée avec succès' })
  @ApiResponse({ status: 401, description: 'Non autorisé - Authentification requise' })
  @ApiResponse({ status: 403, description: 'Accès interdit - Permission requise' })
  async findAll() {
    return await this.projectRoleService.findAll();
  }

  @Get(':id')
  @RequirePermissions('project_roles.view')
  @ApiOperation({ 
    summary: 'Récupérer un rôle de projet par ID',
    description: 'Récupère les détails d\'un rôle de projet spécifique'
  })
  @ApiParam({ name: 'id', description: 'ID du rôle de projet' })
  @ApiResponse({ status: 200, description: 'Rôle de projet trouvé' })
  @ApiResponse({ status: 404, description: 'Rôle de projet non trouvé' })
  async findOne(@Param('id') id: string) {
    return await this.projectRoleService.findById(id);
  }

  @Get('name/:name')
  @RequirePermissions('project_roles.view')
  @ApiOperation({ 
    summary: 'Récupérer un rôle de projet par nom',
    description: 'Récupère un rôle de projet par son nom'
  })
  @ApiParam({ name: 'name', description: 'Nom du rôle de projet' })
  async findByName(@Param('name') name: string) {
    return await this.projectRoleService.findByName(name);
  }

  @Post()
  @RequirePermissions('project_roles.create')
  @ApiOperation({ 
    summary: 'Créer un nouveau rôle de projet',
    description: 'Crée un nouveau rôle pour les projets'
  })
  @ApiBody({ type: CreateProjectRoleDto })
  @ApiResponse({ status: 201, description: 'Rôle de projet créé avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  async create(@Body() createProjectRoleDto: CreateProjectRoleDto) {
    return await this.projectRoleService.create(createProjectRoleDto);
  }

  @Put(':id')
  @RequirePermissions('project_roles.update')
  @ApiOperation({ 
    summary: 'Mettre à jour un rôle de projet',
    description: 'Modifie un rôle de projet existant'
  })
  @ApiParam({ name: 'id', description: 'ID du rôle de projet' })
  @ApiBody({ type: UpdateProjectRoleDto })
  async update(
    @Param('id') id: string,
    @Body() updateProjectRoleDto: UpdateProjectRoleDto,
  ) {
    return await this.projectRoleService.update(id, updateProjectRoleDto);
  }

  @Delete(':id')
  @RequirePermissions('project_roles.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ 
    summary: 'Supprimer un rôle de projet',
    description: 'Supprime un rôle de projet du système'
  })
  @ApiParam({ name: 'id', description: 'ID du rôle de projet' })
  async remove(@Param('id') id: string) {
    await this.projectRoleService.delete(id);
  }

  // Gestion des permissions pour les rôles de projet
  @Post(':id/permissions')
  @RequirePermissions('project_roles.manage_permissions')
  @ApiOperation({ 
    summary: 'Ajouter une permission à un rôle de projet',
    description: 'Associe une permission de projet à un rôle'
  })
  @ApiParam({ name: 'id', description: 'ID du rôle de projet' })
  @ApiBody({ type: ProjectRolePermissionDto })
  async addPermission(
    @Param('id') id: string,
    @Body() dto: ProjectRolePermissionDto,
  ) {
    return await this.projectRoleService.addPermissionToRole(id, dto.projectPermissionId);
  }

  @Post(':id/permissions/batch')
  @RequirePermissions('project_roles.manage_permissions')
  @ApiOperation({ 
    summary: 'Ajouter plusieurs permissions à un rôle de projet',
    description: 'Associe plusieurs permissions de projet à un rôle'
  })
  @ApiParam({ name: 'id', description: 'ID du rôle de projet' })
  @ApiBody({ type: ProjectRolePermissionsDto })
  async addPermissions(
    @Param('id') id: string,
    @Body() dto: ProjectRolePermissionsDto,
  ) {
    return await this.projectRoleService.addPermissionsToRole(id, dto.projectPermissionIds);
  }

  @Delete(':roleId/permissions/:permissionId')
  @RequirePermissions('project_roles.manage_permissions')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ 
    summary: 'Retirer une permission d\'un rôle de projet',
    description: 'Supprime l\'association entre une permission et un rôle de projet'
  })
  async removePermission(
    @Param('roleId') roleId: string,
    @Param('permissionId') permissionId: string,
  ) {
    await this.projectRoleService.removePermissionFromRole(roleId, permissionId);
  }

  @Put(':id/permissions/sync')
  @RequirePermissions('project_roles.manage_permissions')
  @ApiOperation({ 
    summary: 'Synchroniser les permissions d\'un rôle de projet',
    description: 'Met à jour les permissions d\'un rôle pour correspondre à la liste fournie'
  })
  @ApiParam({ name: 'id', description: 'ID du rôle de projet' })
  @ApiBody({ type: ProjectRolePermissionsDto })
  async syncPermissions(
    @Param('id') id: string,
    @Body() dto: ProjectRolePermissionsDto,
  ) {
    return await this.projectRoleService.syncRolePermissions(id, dto.projectPermissionIds);
  }
}