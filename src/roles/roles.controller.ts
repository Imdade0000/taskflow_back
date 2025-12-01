import { Controller, Get, Post, Put, Delete, Patch, Body, Param, UseGuards, HttpStatus, HttpCode, Query } from '@nestjs/common';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/permissions/permissions.guard';
import { RequirePermissions } from 'src/permissions/decorator/require-permissions.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth, ApiProperty, ApiQuery } from '@nestjs/swagger';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolePermissionDto } from './dto/role-permission.dto';
import { RolePermissionsDto } from './dto/role-permissions.dto';
import { SetAllPermissionsDto } from './dto/set-permission.dto';
import { AssignRoleDto } from './dto/assign-role.dto';


/**
 * Contrôleur pour la gestion des rôles et des permissions associées
 */
@ApiTags('Rôles')
@ApiBearerAuth()
@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  /**
   * Récupère la liste de tous les rôles disponibles
   */
  @Get()
  @RequirePermissions('roles.list')
  @ApiOperation({
    summary: 'Récupérer tous les rôles',
    description: 'Récupère la liste complète des rôles disponibles dans le système'
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des rôles récupérée avec succès'
  })
  @ApiResponse({
    status: 401,
    description: 'Non autorisé - Authentification requise'
  })
  @ApiResponse({
    status: 403,
    description: 'Accès interdit - Permission "roles.list" requise'
  })
  async findAll() {
    return await this.rolesService.findAll();
  }

  /**
   * Recherche un rôle par son nom
   */
  @Get('by-name/:name')
  @RequirePermissions('roles.view')
  @ApiOperation({
    summary: 'Rechercher un rôle par nom',
    description: 'Recherche un rôle spécifique dans le système par son nom'
  })
  @ApiParam({
    name: 'name',
    description: 'Nom du rôle à rechercher',
    type: String,
    required: true
  })
  @ApiResponse({
    status: 200,
    description: 'Rôle trouvé et retourné avec succès'
  })
  @ApiResponse({
    status: 401,
    description: 'Non autorisé - Authentification requise'
  })
  @ApiResponse({
    status: 403,
    description: 'Accès interdit - Permission "roles.view" requise'
  })
  @ApiResponse({
    status: 404,
    description: 'Rôle non trouvé'
  })
  async findByName(@Param('name') name: string) {
    return await this.rolesService.findByName(name);
  }

  /**
   * Récupère les détails d'un rôle spécifique
   */
  @Get(':id')
  @RequirePermissions('roles.view')
  @ApiOperation({
    summary: 'Récupérer un rôle par ID',
    description: 'Récupère les détails complets d\'un rôle spécifique par son identifiant'
  })
  @ApiParam({
    name: 'id',
    description: 'Identifiant unique du rôle',
    type: String,
    required: true
  })
  @ApiResponse({
    status: 200,
    description: 'Rôle trouvé et retourné avec succès'
  })
  @ApiResponse({
    status: 401,
    description: 'Non autorisé - Authentification requise'
  })
  @ApiResponse({
    status: 403,
    description: 'Accès interdit - Permission "roles.view" requise'
  })
  @ApiResponse({
    status: 404,
    description: 'Rôle non trouvé'
  })
  async findOne(@Param('id') id: string) {
    return await this.rolesService.findById(id);
  }

  /**
   * Crée un nouveau rôle dans le système
   */
  @Post()
  @RequirePermissions('roles.create')
  @ApiOperation({
    summary: 'Créer un nouveau rôle',
    description: 'Crée un nouveau rôle avec le nom et la description fournis'
  })
  @ApiBody({
    type: CreateRoleDto,
    description: 'Données pour la création du rôle'
  })
  @ApiResponse({
    status: 201,
    description: 'Rôle créé avec succès'
  })
  @ApiResponse({
    status: 400,
    description: 'Requête invalide - Les données fournies sont incorrectes'
  })
  @ApiResponse({
    status: 401,
    description: 'Non autorisé - Authentification requise'
  })
  @ApiResponse({
    status: 403,
    description: 'Accès interdit - Permission "roles.create" requise'
  })
  async create(@Body() createRoleDto: CreateRoleDto) {
    return await this.rolesService.create(createRoleDto);
  }

  /**
   * Met à jour un rôle existant
   */
  @Put(':id')
  @RequirePermissions('roles.update')
  @ApiOperation({
    summary: 'Mettre à jour un rôle',
    description: 'Modifie les informations d\'un rôle existant'
  })
  @ApiParam({
    name: 'id',
    description: 'Identifiant unique du rôle à mettre à jour',
    type: String,
    required: true
  })
  @ApiBody({
    type: UpdateRoleDto,
    description: 'Données de mise à jour du rôle'
  })
  @ApiResponse({
    status: 200,
    description: 'Rôle mis à jour avec succès'
  })
  @ApiResponse({
    status: 400,
    description: 'Requête invalide - Les données fournies sont incorrectes'
  })
  @ApiResponse({
    status: 401,
    description: 'Non autorisé - Authentification requise'
  })
  @ApiResponse({
    status: 403,
    description: 'Accès interdit - Permission "roles.update" requise'
  })
  @ApiResponse({
    status: 404,
    description: 'Rôle non trouvé'
  })
  async update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return await this.rolesService.update(id, updateRoleDto);
  }

  /**
   * Supprime un rôle du système
   */
  @Delete(':id')
  @RequirePermissions('roles.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Supprimer un rôle',
    description: 'Supprime définitivement un rôle du système'
  })
  @ApiParam({
    name: 'id',
    description: 'Identifiant unique du rôle à supprimer',
    type: String,
    required: true
  })
  @ApiResponse({
    status: 204,
    description: 'Rôle supprimé avec succès'
  })
  @ApiResponse({
    status: 401,
    description: 'Non autorisé - Authentification requise'
  })
  @ApiResponse({
    status: 403,
    description: 'Accès interdit - Permission "roles.delete" requise'
  })
  @ApiResponse({
    status: 404,
    description: 'Rôle non trouvé'
  })
  async remove(@Param('id') id: string) {
    await this.rolesService.delete(id);
  }

  /**
   * Ajoute une permission à un rôle existant
   */
  @Post(':id/permissions')
  @RequirePermissions('roles.manage_permissions')
  @ApiOperation({
    summary: 'Ajouter une permission à un rôle',
    description: 'Associe une permission spécifique à un rôle existant'
  })
  @ApiParam({
    name: 'id',
    description: 'Identifiant unique du rôle',
    type: String,
    required: true
  })
  @ApiBody({
    type: RolePermissionDto,
    description: 'Identifiant de la permission à ajouter'
  })
  @ApiResponse({
    status: 200,
    description: 'Permission ajoutée au rôle avec succès'
  })
  @ApiResponse({
    status: 400,
    description: 'Requête invalide ou permission déjà associée au rôle'
  })
  @ApiResponse({
    status: 401,
    description: 'Non autorisé - Authentification requise'
  })
  @ApiResponse({
    status: 403,
    description: 'Accès interdit - Permission "roles.manage_permissions" requise'
  })
  @ApiResponse({
    status: 404,
    description: 'Rôle ou permission non trouvé'
  })
  async addPermission(
    @Param('id') id: string,
    @Body() rolePermissionDto: RolePermissionDto,
  ) {
    return await this.rolesService.addPermissionToRole(id, rolePermissionDto.permissionId);
  }

  /**
   * Ajoute plusieurs permissions à un rôle
   */
  @Post(':id/permissions/batch')
  @RequirePermissions('roles.manage_permissions')
  @ApiOperation({
    summary: 'Ajouter plusieurs permissions à un rôle',
    description: 'Associe plusieurs permissions à un rôle existant en une seule opération'
  })
  @ApiParam({
    name: 'id',
    description: 'Identifiant unique du rôle',
    type: String,
    required: true
  })
  @ApiBody({
    type: RolePermissionsDto,
    description: 'Liste des identifiants de permissions à ajouter'
  })
  @ApiResponse({
    status: 200,
    description: 'Permissions ajoutées au rôle avec succès'
  })
  @ApiResponse({
    status: 400,
    description: 'Requête invalide'
  })
  @ApiResponse({
    status: 401,
    description: 'Non autorisé - Authentification requise'
  })
  @ApiResponse({
    status: 403,
    description: 'Accès interdit - Permission "roles.manage_permissions" requise'
  })
  @ApiResponse({
    status: 404,
    description: 'Rôle non trouvé'
  })
  async addPermissions(
    @Param('id') id: string,
    @Body() rolePermissionsDto: RolePermissionsDto,
  ) {
    return await this.rolesService.addPermissionsToRole(id, rolePermissionsDto.permissionIds);
  }



  /**
   * Retire une permission d'un rôle
   */
  @Delete(':roleId/permissions/:permissionId')
  @RequirePermissions('roles.manage_permissions')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Retirer une permission d\'un rôle',
    description: 'Supprime l\'association entre une permission et un rôle'
  })
  @ApiParam({
    name: 'roleId',
    description: 'Identifiant unique du rôle',
    type: String,
    required: true
  })
  @ApiParam({
    name: 'permissionId',
    description: 'Identifiant unique de la permission à retirer',
    type: String,
    required: true
  })
  @ApiResponse({
    status: 204,
    description: 'Permission retirée du rôle avec succès'
  })
  @ApiResponse({
    status: 401,
    description: 'Non autorisé - Authentification requise'
  })
  @ApiResponse({
    status: 403,
    description: 'Accès interdit - Permission "roles.manage_permissions" requise'
  })
  @ApiResponse({
    status: 404,
    description: 'Rôle ou permission non trouvé, ou permission non associée au rôle'
  })
  async removePermission(
    @Param('roleId') roleId: string,
    @Param('permissionId') permissionId: string,
  ) {
    await this.rolesService.removePermissionFromRole(roleId, permissionId);
  }

  /**
   * Retire plusieurs permissions d'un rôle
   */
  @Delete(':id/permissions')
  @RequirePermissions('roles.manage_permissions')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Retirer plusieurs permissions d\'un rôle',
    description: 'Supprime plusieurs associations entre des permissions et un rôle en une seule opération'
  })
  @ApiParam({
    name: 'id',
    description: 'Identifiant unique du rôle',
    type: String,
    required: true
  })
  @ApiBody({
    type: RolePermissionsDto,
    description: 'Liste des identifiants de permissions à retirer'
  })
  @ApiResponse({
    status: 204,
    description: 'Permissions retirées du rôle avec succès'
  })
  @ApiResponse({
    status: 401,
    description: 'Non autorisé - Authentification requise'
  })
  @ApiResponse({
    status: 403,
    description: 'Accès interdit - Permission "roles.manage_permissions" requise'
  })
  @ApiResponse({
    status: 404,
    description: 'Rôle non trouvé'
  })
  async removePermissions(
    @Param('id') id: string,
    @Body() rolePermissionsDto: RolePermissionsDto,
  ) {
    await this.rolesService.removePermissionsFromRole(id, rolePermissionsDto.permissionIds);
  }

  /**
   * Synchronise les permissions d'un rôle
   */
  @Put(':id/permissions/sync')
  @RequirePermissions('roles.manage_permissions')
  @ApiOperation({
    summary: 'Synchroniser les permissions d\'un rôle',
    description: 'Met à jour les permissions d\'un rôle pour correspondre exactement à la liste fournie'
  })
  @ApiParam({
    name: 'id',
    description: 'Identifiant unique du rôle',
    type: String,
    required: true
  })
  @ApiBody({
    type: RolePermissionsDto,
    description: 'Liste des identifiants de permissions à synchroniser'
  })
  @ApiResponse({
    status: 200,
    description: 'Permissions du rôle synchronisées avec succès'
  })
  @ApiResponse({
    status: 401,
    description: 'Non autorisé - Authentification requise'
  })
  @ApiResponse({
    status: 403,
    description: 'Accès interdit - Permission "roles.manage_permissions" requise'
  })
  @ApiResponse({
    status: 404,
    description: 'Rôle non trouvé'
  })
  async syncPermissions(
    @Param('id') id: string,
    @Body() rolePermissionsDto: RolePermissionsDto,
  ) {
    return await this.rolesService.syncRolePermissions(id, rolePermissionsDto.permissionIds);
  }

  /**
   * Ajoute toutes les permissions disponibles à un rôle
   */
  @Post(':id/permissions/all')
  @RequirePermissions('roles.manage_permissions')
  @ApiOperation({
    summary: 'Ajouter toutes les permissions à un rôle',
    description: 'Associe toutes les permissions disponibles dans le système à un rôle'
  })
  @ApiParam({
    name: 'id',
    description: 'Identifiant unique du rôle',
    type: String,
    required: true
  })
  @ApiResponse({
    status: 200,
    description: 'Toutes les permissions ajoutées au rôle avec succès'
  })
  @ApiResponse({
    status: 401,
    description: 'Non autorisé - Authentification requise'
  })
  @ApiResponse({
    status: 403,
    description: 'Accès interdit - Permission "roles.manage_permissions" requise'
  })
  @ApiResponse({
    status: 404,
    description: 'Rôle non trouvé'
  })
  async addAllPermissions(@Param('id') id: string) {
    return await this.rolesService.addAllPermissionsToRole(id);
  }

  /**
 * Définit si un rôle a accès à toutes les permissions
 */
@Patch(':id/permissions')
@RequirePermissions('roles.manage_permissions')
@ApiOperation({ 
  summary: 'Définir hasAllPermissions pour un rôle',
  description: 'Active ou désactive l\'accès automatique à toutes les permissions pour un rôle'
})
@ApiParam({ 
  name: 'id', 
  description: 'Identifiant unique du rôle',
  type: String 
})
@ApiBody({
  schema: {
    type: 'object',
    properties: {
      hasAllPermissions: { 
        type: 'boolean',
        description: 'Valeur booléenne pour activer/désactiver l\'accès à toutes les permissions'
      }
    },
    required: ['hasAllPermissions']
  }
})
@ApiResponse({
  status: 200,
  description: 'Paramètre mis à jour avec succès'
})
@ApiResponse({
  status: 400,
  description: 'Requête invalide'
})
@ApiResponse({
  status: 401,
  description: 'Non autorisé - Authentification requise'
})
@ApiResponse({
  status: 403,
  description: 'Accès interdit - Permission "roles.manage_permissions" requise'
})
@ApiResponse({
  status: 404,
  description: 'Rôle non trouvé'
})
async updateAllPermissionsToggle(
  @Param('id') id: string,
  @Body('hasAllPermissions') hasAllPermissions: boolean
) {
  return this.rolesService.setHasAllPermissions(id, hasAllPermissions);
}

  /**
   * Assigne un rôle à un utilisateur
   */
  @Post('assign/:userId')
  @RequirePermissions('roles.assign')
  @ApiOperation({
    summary: 'Assigner un rôle à un utilisateur',
    description: 'Attribue un rôle spécifique à un utilisateur'
  })
  @ApiParam({
    name: 'userId',
    description: 'Identifiant unique de l\'utilisateur',
    type: String,
    required: true
  })
  @ApiBody({
    type: AssignRoleDto,
    description: 'Identifiant du rôle à assigner'
  })
  @ApiResponse({
    status: 200,
    description: 'Rôle assigné à l\'utilisateur avec succès'
  })
  @ApiResponse({
    status: 400,
    description: 'Requête invalide ou rôle déjà assigné à l\'utilisateur'
  })
  @ApiResponse({
    status: 401,
    description: 'Non autorisé - Authentification requise'
  })
  @ApiResponse({
    status: 403,
    description: 'Accès interdit - Permission "roles.assign" requise'
  })
  @ApiResponse({
    status: 404,
    description: 'Utilisateur ou rôle non trouvé'
  })
  async assignToUser(
    @Param('userId') userId: string,
    @Body() assignRoleDto: AssignRoleDto,
  ) {
    return await this.rolesService.assignRoleToUser(userId, assignRoleDto.roleId);
  }
}