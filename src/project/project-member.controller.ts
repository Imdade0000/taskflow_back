import { 
  Controller, 
  Post, 
  Param, 
  Body, 
  Delete, 
  Get, 
  Patch,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ProjectMemberService } from './project-member.service';
import { CreateProjectMemberDto } from './dto/create-project-member.dto';
import { UpdateProjectMemberRoleDto } from './dto/update-project-member-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectPermissionsGuard } from './project-permissions.guard';
import { RequireProjectPermissions } from './decorator/require-project-permissions.decorator';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam, 
  ApiBody, 
  ApiBearerAuth 
} from '@nestjs/swagger';

@ApiTags('Project Members')
@ApiBearerAuth()
@Controller('projects/:projectId/members')
@UseGuards(JwtAuthGuard, ProjectPermissionsGuard)
export class ProjectMemberController {
  constructor(private readonly memberService: ProjectMemberService) {}

  @Post()
  @RequireProjectPermissions('project.members.add')
  @ApiOperation({ 
    summary: 'Ajouter un membre au projet',
    description: 'Ajoute un nouvel utilisateur comme membre du projet avec un rôle spécifique'
  })
  @ApiParam({ name: 'projectId', description: 'ID du projet' })
  @ApiBody({ type: CreateProjectMemberDto })
  @ApiResponse({ status: 201, description: 'Membre ajouté avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides ou utilisateur déjà membre' })
  @ApiResponse({ status: 403, description: 'Permission insuffisante' })
  @ApiResponse({ status: 404, description: 'Projet, utilisateur ou rôle non trouvé' })
  async addMember(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateProjectMemberDto
  ) {
    return this.memberService.addMember(projectId, dto);
  }

  @Get()
  @RequireProjectPermissions('project.members.view')
  @ApiOperation({ 
    summary: 'Lister les membres du projet',
    description: 'Récupère la liste de tous les membres actifs du projet'
  })
  @ApiParam({ name: 'projectId', description: 'ID du projet' })
  @ApiResponse({ status: 200, description: 'Liste des membres récupérée avec succès' })
  @ApiResponse({ status: 403, description: 'Permission insuffisante' })
  @ApiResponse({ status: 404, description: 'Projet non trouvé' })
  async listMembers(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.memberService.listMembers(projectId);
  }

  @Get(':userId')
  @RequireProjectPermissions('project.members.view')
  @ApiOperation({ 
    summary: 'Récupérer un membre spécifique du projet',
    description: 'Récupère les détails d\'un membre spécifique du projet'
  })
  @ApiParam({ name: 'projectId', description: 'ID du projet' })
  @ApiParam({ name: 'userId', description: 'ID de l\'utilisateur membre' })
  @ApiResponse({ status: 200, description: 'Membre trouvé avec succès' })
  @ApiResponse({ status: 403, description: 'Permission insuffisante' })
  @ApiResponse({ status: 404, description: 'Projet ou membre non trouvé' })
  async getMember(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('userId', ParseUUIDPipe) userId: string
  ) {
    return this.memberService.getMember(projectId, userId);
  }

  @Patch(':userId/role')
  @RequireProjectPermissions('project.members.manage_roles')
  @ApiOperation({ 
    summary: 'Modifier le rôle d\'un membre',
    description: 'Met à jour le rôle d\'un membre existant du projet'
  })
  @ApiParam({ name: 'projectId', description: 'ID du projet' })
  @ApiParam({ name: 'userId', description: 'ID de l\'utilisateur membre' })
  @ApiBody({ type: UpdateProjectMemberRoleDto })
  @ApiResponse({ status: 200, description: 'Rôle du membre mis à jour avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 403, description: 'Permission insuffisante' })
  @ApiResponse({ status: 404, description: 'Projet, membre ou rôle non trouvé' })
  async updateMemberRole(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateProjectMemberRoleDto
  ) {
    return this.memberService.updateMemberRole(projectId, userId, dto);
  }

  @Patch(':userId/activate')
  @RequireProjectPermissions('project.members.manage_roles')
  @ApiOperation({ 
    summary: 'Activer un membre du projet',
    description: 'Active un membre désactivé du projet'
  })
  @ApiParam({ name: 'projectId', description: 'ID du projet' })
  @ApiParam({ name: 'userId', description: 'ID de l\'utilisateur membre' })
  @ApiResponse({ status: 200, description: 'Membre activé avec succès' })
  @ApiResponse({ status: 403, description: 'Permission insuffisante' })
  @ApiResponse({ status: 404, description: 'Projet ou membre non trouvé' })
  async activateMember(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('userId', ParseUUIDPipe) userId: string
  ) {
    return this.memberService.toggleMemberStatus(projectId, userId, true);
  }

  @Patch(':userId/deactivate')
  @RequireProjectPermissions('project.members.manage_roles')
  @ApiOperation({ 
    summary: 'Désactiver un membre du projet',
    description: 'Désactive un membre du projet sans le supprimer'
  })
  @ApiParam({ name: 'projectId', description: 'ID du projet' })
  @ApiParam({ name: 'userId', description: 'ID de l\'utilisateur membre' })
  @ApiResponse({ status: 200, description: 'Membre désactivé avec succès' })
  @ApiResponse({ status: 403, description: 'Permission insuffisante' })
  @ApiResponse({ status: 404, description: 'Projet ou membre non trouvé' })
  async deactivateMember(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('userId', ParseUUIDPipe) userId: string
  ) {
    return this.memberService.toggleMemberStatus(projectId, userId, false);
  }

  @Delete(':userId')
  @RequireProjectPermissions('project.members.remove')
  @ApiOperation({ 
    summary: 'Supprimer un membre du projet',
    description: 'Retire définitivement un membre du projet'
  })
  @ApiParam({ name: 'projectId', description: 'ID du projet' })
  @ApiParam({ name: 'userId', description: 'ID de l\'utilisateur membre' })
  @ApiResponse({ status: 200, description: 'Membre supprimé avec succès' })
  @ApiResponse({ status: 403, description: 'Permission insuffisante' })
  @ApiResponse({ status: 404, description: 'Projet ou membre non trouvé' })
  async removeMember(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('userId', ParseUUIDPipe) userId: string
  ) {
    return this.memberService.removeMember(projectId, userId);
  }

  @Get(':userId/permissions')
  @RequireProjectPermissions('project.members.view')
  @ApiOperation({ 
    summary: 'Récupérer les permissions d\'un membre',
    description: 'Récupère toutes les permissions qu\'un membre a sur le projet'
  })
  @ApiParam({ name: 'projectId', description: 'ID du projet' })
  @ApiParam({ name: 'userId', description: 'ID de l\'utilisateur membre' })
  @ApiResponse({ status: 200, description: 'Permissions du membre récupérées avec succès' })
  @ApiResponse({ status: 403, description: 'Permission insuffisante' })
  @ApiResponse({ status: 404, description: 'Projet ou membre non trouvé' })
  async getMemberPermissions(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('userId', ParseUUIDPipe) userId: string
  ) {
    return this.memberService.getMemberPermissions(projectId, userId);
  }
}