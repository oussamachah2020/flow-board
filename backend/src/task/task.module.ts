import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './entities/task.entity';
import { TaskEvent } from './entities/task-event.entity';
import { Comment } from './entities/comment.entity';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { TaskEventsService } from './events.service';
import { BoardModule } from '../board/board.module';
import { WorkspaceModule } from '../workspace/workspace.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, TaskEvent, Comment]),
    BoardModule,
    WorkspaceModule,
    AuthModule,
  ],
  controllers: [TaskController],
  providers: [TaskService, TaskEventsService],
  exports: [TaskService, TypeOrmModule],
})
export class TaskModule {}
