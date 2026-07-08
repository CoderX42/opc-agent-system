import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentType } from '../../modules/agent/entities/agent.entity';
import { AgentTask, AgentTaskStatus } from './entities/agent-task.entity';

@Injectable()
export class AgentTaskService {
  constructor(
    @InjectRepository(AgentTask)
    private readonly tasks: Repository<AgentTask>,
  ) {}

  async create(input: {
    userId: string;
    agentId?: string;
    agentType?: AgentType;
    taskType: string;
    payload: Record<string, unknown>;
  }): Promise<AgentTask> {
    return this.tasks.save(
      this.tasks.create({
        userId: input.userId,
        agentId: input.agentId || null,
        agentType: input.agentType || null,
        taskType: input.taskType,
        status: AgentTaskStatus.WAITING,
        input: input.payload,
        plan: null,
        result: null,
        error: null,
      }),
    );
  }

  async findOne(id: string, userId?: string): Promise<AgentTask> {
    const task = await this.tasks.findOne({
      where: userId ? { id, userId } : { id },
    });
    if (!task) throw new NotFoundException(`AgentTask #${id} not found`);
    return task;
  }

  async updateStatus(
    id: string,
    status: AgentTaskStatus,
    patch: Partial<Pick<AgentTask, 'agentId' | 'agentType' | 'plan' | 'result' | 'error'>> = {},
  ): Promise<AgentTask> {
    const task = await this.findOne(id);
    Object.assign(task, patch, { status });
    return this.tasks.save(task);
  }
}
