import { Injectable } from '@nestjs/common';
import { AgentType } from '../../../modules/agent/entities/agent.entity';
import { AdminService } from '../../../modules/admin/admin.service';
import { AgentTool, AgentToolContext } from '../agent-runtime.types';

@Injectable()
export class CreateAdminTaskTool implements AgentTool {
  name = 'admin.create_task';
  description = '创建行政任务';
  supportedAgentTypes = [AgentType.ADMIN];

  constructor(private readonly admin: AdminService) {}

  async execute(context: AgentToolContext): Promise<unknown> {
    const title = String(context.metadata?.title || context.input).slice(0, 120);
    return this.admin.createTask(context.userId, {
      title,
      description: context.input,
      priority: undefined,
      dueDate: typeof context.metadata?.dueDate === 'string' ? context.metadata.dueDate : undefined,
      assigneeId: typeof context.metadata?.assigneeId === 'string' ? context.metadata.assigneeId : undefined,
    });
  }
}

@Injectable()
export class CreateScheduleTool implements AgentTool {
  name = 'admin.create_schedule';
  description = '创建日程；需要 startTime 元数据，缺失时返回待补充信息';
  supportedAgentTypes = [AgentType.ADMIN];

  constructor(private readonly admin: AdminService) {}

  async execute(context: AgentToolContext): Promise<unknown> {
    if (typeof context.metadata?.startTime !== 'string') {
      return { required: ['startTime'], message: '创建日程需要 startTime' };
    }
    const title = String(context.metadata?.title || context.input).slice(0, 120);
    return this.admin.createSchedule(context.userId, {
      title,
      description: context.input,
      startTime: context.metadata.startTime,
      endTime: typeof context.metadata.endTime === 'string' ? context.metadata.endTime : undefined,
      type: typeof context.metadata.type === 'string' ? context.metadata.type : undefined,
      location: typeof context.metadata.location === 'string' ? context.metadata.location : undefined,
      isAllDay: typeof context.metadata.isAllDay === 'boolean' ? context.metadata.isAllDay : undefined,
    });
  }
}
