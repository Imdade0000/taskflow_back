
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req, ForbiddenException, BadRequestException, NotFoundException, createParamDecorator } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/createUserDto';
import { UpdateUserDto } from './dto/updateUserDto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from './decorators/user.decorator';

@ApiTags('Utilisateurs')
@Controller('users')
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Crée un nouvel utilisateur dans le système
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: 'Créer un nouvel utilisateur',
    description: 'Permet de créer un nouvel utilisateur dans le système avec les informations fournies'
  })
  @ApiBody({ 
    type: CreateUserDto,
    description: 'Données nécessaires pour créer un utilisateur'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'L\'utilisateur a été créé avec succès' 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Requête invalide - Les données fournies sont incorrectes' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Ressource non trouvée' 
  })
  async create(@Body() createUserDto: CreateUserDto) {
    try {
      const user = await this.usersService.create(createUserDto);
      return user;
    } catch (error) {
      if (error.message.includes('existe déjà')) {
        throw new BadRequestException(error.message);
      }
      throw new NotFoundException(error.message);
    }
  }

  /**
   * Récupère tous les utilisateurs avec options de pagination et filtres
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: 'Récupérer tous les utilisateurs',
    description: 'Retourne une liste paginée des utilisateurs avec options de filtrage'
  })
  @ApiQuery({ 
    name: 'page', 
    description: 'Numéro de la page à récupérer',
    required: false,
    type: Number,
    example: 1
  })
  @ApiQuery({ 
    name: 'limit', 
    description: 'Nombre d\'utilisateurs par page',
    required: false,
    type: Number,
    example: 10
  })
  @ApiQuery({ 
    name: 'includeDeleted', 
    description: 'Inclure les utilisateurs supprimés (soft delete)',
    required: false,
    type: Boolean,
    example: false
  })
  @ApiQuery({ 
    name: 'includeInactive', 
    description: 'Inclure les utilisateurs inactifs',
    required: false,
    type: Boolean,
    example: false
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Liste des utilisateurs récupérée avec succès' 
  })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,

  ) {
    return this.usersService.findAll(
      page ? +page : 1,
      limit ? +limit : 10
    );
  }

  /**
   * Recherche des utilisateurs selon différents critères
   */
  @Get('search')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: 'Rechercher des utilisateurs',
    description: 'Recherche des utilisateurs selon différents critères (email, nom, etc.)'
  })
  @ApiQuery({ 
    name: 'query', 
    description: 'Texte à rechercher (email, nom d\'utilisateur, etc.)',
    required: true,
    type: String
  })
  @ApiQuery({ 
    name: 'page', 
    description: 'Numéro de la page à récupérer',
    required: false,
    type: Number,
    example: 1
  })
  @ApiQuery({ 
    name: 'limit', 
    description: 'Nombre d\'utilisateurs par page',
    required: false,
    type: Number,
    example: 10
  })
  @ApiQuery({ 
    name: 'includeDeleted', 
    description: 'Inclure les utilisateurs supprimés',
    required: false,
    type: Boolean,
    example: false
  })
  @ApiQuery({ 
    name: 'includeInactive', 
    description: 'Inclure les utilisateurs inactifs',
    required: false,
    type: Boolean,
    example: false
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Liste des utilisateurs correspondant aux critères de recherche' 
  })
  async search(
    @Query('query') query: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('includeDeleted') includeDeleted?: boolean,
    @Query('includeInactive') includeInactive?: boolean,
  ) {
    if (!query) {
      throw new BadRequestException('Le paramètre de recherche est requis');
    }
    
    return this.usersService.search(
      query,
      page ? +page : 1,
      limit ? +limit : 10
    );
  }

  /**
   * Récupère l'utilisateur actuellement connecté
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: 'Récupérer l\'utilisateur connecté',
    description: 'Renvoie les détails de l\'utilisateur actuellement connecté (basé sur le token JWT)'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Informations de l\'utilisateur connecté' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Utilisateur non trouvé' 
  })
  async getCurrentUser(@User('id') userId: string) {
    try {
      return await this.usersService.getCurrentUser(userId);
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }

  /**
   * Récupère les détails d'un utilisateur spécifique par son ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: 'Récupérer un utilisateur par ID',
    description: 'Retourne les détails complets d\'un utilisateur spécifique'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Identifiant unique de l\'utilisateur',
    type: String,
    required: true
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Utilisateur trouvé et retourné avec succès' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Utilisateur non trouvé' 
  })
  async findOne(@Param('id') id: string) {
    try {
      return await this.usersService.findOne(id);
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }

  /**
   * Met à jour les informations d'un utilisateur existant
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: 'Mettre à jour un utilisateur',
    description: 'Permet de modifier les informations d\'un utilisateur existant'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Identifiant unique de l\'utilisateur à modifier',
    type: String,
    required: true
  })
  @ApiBody({ 
    type: UpdateUserDto,
    description: 'Données de mise à jour de l\'utilisateur'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Utilisateur mis à jour avec succès' 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Requête invalide - Les données fournies sont incorrectes' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Utilisateur non trouvé' 
  })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    try {
      return await this.usersService.update(id, updateUserDto);
    } catch (error) {
      if (error.message.includes('existe déjà')) {
        throw new BadRequestException(error.message);
      }
      throw new NotFoundException(error.message);
    }
  }

  /**
   * Supprime temporairement un utilisateur (soft delete)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: 'Supprimer un utilisateur (soft delete)',
    description: 'Effectue une suppression logique de l\'utilisateur (peut être restauré)'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Identifiant unique de l\'utilisateur à supprimer',
    type: String,
    required: true
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Utilisateur supprimé avec succès (soft delete)' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Utilisateur non trouvé' 
  })
  async remove(@Param('id') id: string) {
    try {
      return await this.usersService.remove(id);
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }

  /**
   * Supprime définitivement un utilisateur de la base de données
   */
  @Delete(':id/hard')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: 'Supprimer définitivement un utilisateur (hard delete)',
    description: 'Supprime définitivement l\'utilisateur de la base de données (action irréversible)'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Identifiant unique de l\'utilisateur à supprimer définitivement',
    type: String,
    required: true
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Utilisateur supprimé définitivement avec succès' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Utilisateur non trouvé' 
  })
  async hardRemove(@Param('id') id: string) {
    try {
      return await this.usersService.hardRemove(id);
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }

  /**
   * Active ou désactive un compte utilisateur
   */
  @Put(':id/active')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: 'Activer/désactiver un utilisateur',
    description: 'Permet d\'activer ou de désactiver le compte d\'un utilisateur'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Identifiant unique de l\'utilisateur',
    type: String,
    required: true
  })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        isActive: {
          type: 'boolean',
          description: 'État d\'activation du compte',
          example: true
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'État du compte utilisateur modifié avec succès' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Utilisateur non trouvé' 
  })
  async toggleActive(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    try {
      return await this.usersService.toggleActive(id, isActive);
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }

  /**
   * Met à jour le département d'un utilisateur
   */
  @Put(':id/department')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: 'Mettre à jour le département d\'un utilisateur',
    description: 'Modifie le département auquel un utilisateur est rattaché'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Identifiant unique de l\'utilisateur',
    type: String,
    required: true
  })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        departementId: {
          type: 'string',
          description: 'Identifiant du département',
          example: '60d21b4667d0d8992e610c85'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Département de l\'utilisateur mis à jour avec succès' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Utilisateur ou département non trouvé' 
  })
  async updateDepartment(@Param('id') id: string, @Body('departementId') departementId: string) {
    try {
      return await this.usersService.updateDepartment(id, departementId);
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }

  /**
   * Met à jour le rôle d'un utilisateur
   */
  @Put(':id/role')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: 'Mettre à jour le rôle d\'un utilisateur',
    description: 'Modifie le rôle attribué à un utilisateur (permissions)'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Identifiant unique de l\'utilisateur',
    type: String,
    required: true
  })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        roleId: {
          type: 'string',
          description: 'Identifiant du rôle',
          example: '60d21b4667d0d8992e610c87'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Rôle de l\'utilisateur mis à jour avec succès' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Utilisateur ou rôle non trouvé' 
  })
  async updateRole(@Param('id') id: string, @Body('roleId') roleId: string) {
    try {
      return await this.usersService.updateRole(id, roleId);
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }

  /**
   * Récupère tous les projets associés à un utilisateur
   */
  @Get(':id/projects')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: 'Récupérer les projets d\'un utilisateur',
    description: 'Récupère la liste de tous les projets associés à un utilisateur spécifique'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Identifiant unique de l\'utilisateur',
    type: String,
    required: true
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Liste des projets récupérée avec succès' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Utilisateur non trouvé' 
  })
  async getUserProjects(@Param('id') userId: string) {
    try {
      return await this.usersService.getUserProjects(userId);
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }

  /**
   * Configure l'authentification à deux facteurs pour un utilisateur
   */
  @Put(':id/2fa')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: 'Configurer l\'authentification à deux facteurs',
    description: 'Active ou désactive l\'authentification à deux facteurs pour un compte utilisateur'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Identifiant unique de l\'utilisateur',
    type: String,
    required: true
  })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        enable: {
          type: 'boolean',
          description: 'Activer ou désactiver l\'authentification à deux facteurs',
          example: true
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Configuration 2FA mise à jour avec succès' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Utilisateur non trouvé' 
  })
  async configureTwoFactor(@Param('id') userId: string, @Body('enable') enable: boolean) {
    try {
      return await this.usersService.configureTwoFactor(userId, enable);
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }
}