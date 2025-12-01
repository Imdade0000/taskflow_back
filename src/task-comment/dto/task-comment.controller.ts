// tasks.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { TasksService } from 'src/tasks/tasks.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CreateTaskCommentDto } from './create-task-comment.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Tasks Comments')
@ApiBearerAuth()
@Controller('tasks/:taskId/comments')
@UseGuards(JwtAuthGuard)
export class TaskCommentsController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Ajouter un commentaire à une tâche' })
  @ApiResponse({ status: 201, description: 'Commentaire ajouté avec succès' })
  @ApiResponse({ status: 404, description: 'Tâche non trouvée' })
  async addComment(
    @Param('taskId') taskId: string,
    @Body() createTaskCommentDto: CreateTaskCommentDto,
    @Req() req: any
  ) {
    return this.tasksService.addTaskComment(
      taskId,
      createTaskCommentDto.content,
      req.user.id
    );
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer les commentaires d\'une tâche' })
  @ApiResponse({ status: 200, description: 'Liste des commentaires' })
  @ApiResponse({ status: 404, description: 'Tâche non trouvée' })
  async getComments(@Param('taskId') taskId: string) {
    return this.tasksService.getTaskComments(taskId);
  }

  @Put(':commentId')
  @ApiOperation({ summary: 'Modifier un commentaire' })
  @ApiResponse({ status: 200, description: 'Commentaire modifié avec succès' })
  @ApiResponse({ status: 404, description: 'Commentaire non trouvé ou non autorisé' })
  async updateComment(
    @Param('commentId') commentId: string,
    @Body() updateTaskCommentDto: CreateTaskCommentDto,
    @Req() req: any
  ) {
    return this.tasksService.updateComment(
      commentId,
      updateTaskCommentDto.content,
      req.user.id
    );
  }

  @Delete(':commentId')
  @ApiOperation({ summary: 'Supprimer un commentaire' })
  @ApiResponse({ status: 200, description: 'Commentaire supprimé avec succès' })
  @ApiResponse({ status: 404, description: 'Commentaire non trouvé ou non autorisé' })
  async deleteComment(
    @Param('commentId') commentId: string,
    @Req() req: any
  ) {
    return this.tasksService.deleteComment(commentId, req.user.id);
  }

  @Get(':commentId')
  @ApiOperation({ summary: 'Récupérer un commentaire spécifique' })
  @ApiResponse({ status: 200, description: 'Détails du commentaire' })
  @ApiResponse({ status: 404, description: 'Commentaire non trouvé' })
  async getComment(@Param('commentId') commentId: string) {
    return this.tasksService.getComment(commentId);
  }
}