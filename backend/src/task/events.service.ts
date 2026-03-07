import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskEvent } from './entities/task-event.entity';
import { Task } from './entities/task.entity';
import { TaskEventType } from './enums/task-event-type.enum';

@Injectable()
export class TaskEventsService {
  constructor(
    @InjectRepository(TaskEvent)
    private readonly taskEventRepository: Repository<TaskEvent>,
  ) {}

  async record(
    type: TaskEventType,
    task: Task,
    userId: string,
    payload?: Record<string, unknown>,
  ): Promise<TaskEvent> {
    const event = this.taskEventRepository.create({
      taskId: task.id,
      userId,
      type,
      payload: payload ?? null,
    });
    return this.taskEventRepository.save(event);
  }
}
