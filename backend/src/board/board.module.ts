import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Board } from './entities/board.entity';
import { BoardMember } from './entities/board-member.entity';
import { BoardColumn } from './entities/board-column.entity';
import { Task } from '../task/entities/task.entity';
import { BoardController } from './board.controller';
import { BoardService } from './board.service';
import { BoardGuard } from './guards/board.guard';
import { WorkspaceModule } from '../workspace/workspace.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Board, BoardMember, BoardColumn, Task]),
    WorkspaceModule,
    AuthModule,
  ],
  controllers: [BoardController],
  providers: [BoardService, BoardGuard],
  exports: [BoardService, TypeOrmModule],
})
export class BoardModule {}
