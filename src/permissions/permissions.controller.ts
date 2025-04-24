import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, HttpStatus, HttpCode,} from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { PermissionsGuard } from './permissions.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RequirePermissions } from './decorator/require-permissions.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth } from '@nestjs/swagger';

class CreatePermissionDto {
  name: string;
  slug: string;
  description?: string;
}

class UpdatePermissionDto {
  name?: string;
  slug?: string;
  description?: string;
}

@ApiTags('permissions')
@ApiBearerAuth()
@Controller('permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @RequirePermissions('permissions.list')
  @ApiOperation({ summary: 'Récupérer toutes les permissions', description: 'Renvoie la liste complète des permissions disponibles dans le système.' })
  @ApiResponse({ status: 200, description: 'Liste des permissions récupérée avec succès.' })
  @ApiResponse({ status: 401, description: 'Non autorisé - JWT manquant ou invalide.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - Permission requise manquante.' })
  async findAll() {
    return await this.permissionsService.findAll();
  }

  @Get(':id')
  @RequirePermissions('permissions.view')
  @ApiOperation({ summary: 'Récupérer une permission par ID', description: 'Renvoie les détails d\'une permission spécifique basée sur son ID.' })
  @ApiParam({ name: 'id', description: 'ID unique de la permission' })
  @ApiResponse({ status: 200, description: 'Permission trouvée avec succès.' })
  @ApiResponse({ status: 401, description: 'Non autorisé - JWT manquant ou invalide.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - Permission requise manquante.' })
  @ApiResponse({ status: 404, description: 'Permission non trouvée.' })
  async findOne(@Param('id') id: string) {
    return await this.permissionsService.findById(id);
  }

  @Get('slug/:slug')
  @RequirePermissions('permissions.view')
  @ApiOperation({ summary: 'Récupérer une permission par slug', description: 'Renvoie les détails d\'une permission spécifique basée sur son slug.' })
  @ApiParam({ name: 'slug', description: 'Slug unique de la permission' })
  @ApiResponse({ status: 200, description: 'Permission trouvée avec succès.' })
  @ApiResponse({ status: 401, description: 'Non autorisé - JWT manquant ou invalide.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - Permission requise manquante.' })
  @ApiResponse({ status: 404, description: 'Permission non trouvée.' })
  async findBySlug(@Param('slug') slug: string) {
    return await this.permissionsService.findBySlug(slug);
  }

  @Post()
  @RequirePermissions('permissions.create')
  @ApiOperation({ summary: 'Créer une nouvelle permission', description: 'Crée une nouvelle permission dans le système.' })
  @ApiBody({ type: CreatePermissionDto, description: 'Données de la permission à créer' })
  @ApiResponse({ status: 201, description: 'Permission créée avec succès.' })
  @ApiResponse({ status: 400, description: 'Requête invalide - Données invalides ou manquantes.' })
  @ApiResponse({ status: 401, description: 'Non autorisé - JWT manquant ou invalide.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - Permission requise manquante.' })
  @ApiResponse({ status: 409, description: 'Conflit - Une permission avec ce slug existe déjà.' })
  async create(@Body() createPermissionDto: CreatePermissionDto) {
    return await this.permissionsService.create(createPermissionDto);
  }

  @Put(':id')
  @RequirePermissions('permissions.update')
  @ApiOperation({ summary: 'Mettre à jour une permission', description: 'Met à jour les détails d\'une permission existante.' })
  @ApiParam({ name: 'id', description: 'ID unique de la permission à mettre à jour' })
  @ApiBody({ type: UpdatePermissionDto, description: 'Données de la permission à mettre à jour' })
  @ApiResponse({ status: 200, description: 'Permission mise à jour avec succès.' })
  @ApiResponse({ status: 400, description: 'Requête invalide - Données invalides.' })
  @ApiResponse({ status: 401, description: 'Non autorisé - JWT manquant ou invalide.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - Permission requise manquante.' })
  @ApiResponse({ status: 404, description: 'Permission non trouvée.' })
  @ApiResponse({ status: 409, description: 'Conflit - Une permission avec ce slug existe déjà.' })
  async update(
    @Param('id') id: string,
    @Body() updatePermissionDto: UpdatePermissionDto,
  ) {
    return await this.permissionsService.update(id, updatePermissionDto);
  }

  @Delete(':id')
  @RequirePermissions('permissions.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer une permission', description: 'Supprime une permission existante du système.' })
  @ApiParam({ name: 'id', description: 'ID unique de la permission à supprimer' })
  @ApiResponse({ status: 204, description: 'Permission supprimée avec succès.' })
  @ApiResponse({ status: 401, description: 'Non autorisé - JWT manquant ou invalide.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - Permission requise manquante.' })
  @ApiResponse({ status: 404, description: 'Permission non trouvée.' })
  async remove(@Param('id') id: string) {
    await this.permissionsService.delete(id);
  }

  @Get('user/:userId')
  @RequirePermissions('permissions.list')
  @ApiOperation({ summary: 'Récupérer les permissions d\'un utilisateur', description: 'Renvoie toutes les permissions associées à un utilisateur spécifique.' })
  @ApiParam({ name: 'userId', description: 'ID unique de l\'utilisateur' })
  @ApiResponse({ status: 200, description: 'Permissions de l\'utilisateur récupérées avec succès.' })
  @ApiResponse({ status: 401, description: 'Non autorisé - JWT manquant ou invalide.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - Permission requise manquante.' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé.' })
  async getUserPermissions(@Param('userId') userId: string) {
    return await this.permissionsService.getUserPermissions(userId);
  }
}