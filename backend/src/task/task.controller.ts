import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TaskService } from './task.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../workspace/guards/workspace.guard';
import { BoardGuard } from '../board/guards/board.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../types/auth';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { FilterTasksDto } from './dto/filter-tasks.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { AssignTaskDto } from './dto/assign-task.dto';

@Controller('workspaces/:workspaceId/boards/:boardId/tasks')
@UseGuards(JwtAuthGuard, WorkspaceGuard, BoardGuard)
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  createTask(
    @Param('boardId') boardId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTaskDto,
  ) {
    return this.taskService.createTask(boardId, user.sub, dto);
  }

  @Get()
  getTasks(
    @Param('boardId') boardId: string,
    @Query() filters: FilterTasksDto,
  ) {
    return this.taskService.getTasks(boardId, filters);
  }

  @Get('my')
  getMyTasks(
    @Param('boardId') boardId: string,
    @CurrentUser() user: JwtPayload,
    @Query() filters: FilterTasksDto,
  ) {
    return this.taskService.getMyTasks(user.sub, filters);
  }

  @Get(':taskId')
  getTask(@Param('taskId') taskId: string) {
    return this.taskService.getTask(taskId);
  }

  @Patch(':taskId')
  updateTask(
    @Param('taskId') taskId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.taskService.updateTask(taskId, user.sub, dto);
  }

  @Patch(':taskId/move')
  moveTask(
    @Param('taskId') taskId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: MoveTaskDto,
  ) {
    return this.taskService.moveTask(taskId, user.sub, dto);
  }

  @Patch(':taskId/assign')
  assignTask(
    @Param('taskId') taskId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: AssignTaskDto,
  ) {
    return this.taskService.assignTask(taskId, dto.workspaceMemberId, user.sub);
  }

  @Delete(':taskId')
  async deleteTask(
    @Param('taskId') taskId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.taskService.deleteTask(taskId, user.sub);
  }

  @Post(':taskId/comments')
  addComment(
    @Param('taskId') taskId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCommentDto,
  ) {
    return this.taskService.addComment(taskId, user.sub, dto);
  }

  @Get(':taskId/comments')
  getComments(@Param('taskId') taskId: string) {
    return this.taskService.getComments(taskId);
  }

  @Patch(':taskId/comments/:commentId')
  updateComment(
    @Param('commentId') commentId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.taskService.updateComment(commentId, user.sub, dto);
  }

  @Delete(':taskId/comments/:commentId')
  async deleteComment(
    @Param('commentId') commentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.taskService.deleteComment(commentId, user.sub);
  }
}
