import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent, AgentStatus, AgentType } from './entities/agent.entity';
import { AgentQueryDto } from './dto/agent-query.dto';
import { AiService } from '../../ai/ai.service';
import { CreateAgentDto, UpdateAgentDto } from './dto/agent.dto';

@Injectable()
export class AgentService {
  constructor(
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
    private readonly aiService: AiService,
  ) {}

  async create(data: CreateAgentDto): Promise<Agent> {
    const agent = this.agentRepository.create(data);
    return this.agentRepository.save(agent);
  }

  async findAll(query: AgentQueryDto): Promise<{ items: Agent[]; total: number }> {
    const { type, name, status, page, limit, sortBy, sortOrder } = query;
    const queryBuilder = this.agentRepository.createQueryBuilder('agent');

    if (type) {
      queryBuilder.andWhere('agent.type = :type', { type });
    }
    if (name) {
      queryBuilder.andWhere('agent.name LIKE :name', { name: `%${name}%` });
    }
    if (status) {
      queryBuilder.andWhere('agent.status = :status', { status });
    }

    queryBuilder
      .orderBy(`agent.${sortBy || 'createdAt'}`, sortOrder || 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();
    return { items, total };
  }

  async findOne(id: string): Promise<Agent> {
    const agent = await this.agentRepository.findOne({ where: { id } });
    if (!agent) {
      throw new NotFoundException(`Agent #${id} not found`);
    }
    return agent;
  }

  async findByType(type: AgentType): Promise<Agent[]> {
    return this.agentRepository.find({
      where: { type, status: AgentStatus.ACTIVE },
    });
  }

  async update(id: string, data: UpdateAgentDto): Promise<Agent> {
    const agent = await this.findOne(id);
    Object.assign(agent, data);
    return this.agentRepository.save(agent);
  }

  async remove(id: string): Promise<void> {
    const agent = await this.findOne(id);
    await this.agentRepository.remove(agent);
  }

  async getActiveAgents(): Promise<Agent[]> {
    return this.agentRepository.find({
      where: { status: AgentStatus.ACTIVE },
    });
  }

  async setStatus(id: string, status: AgentStatus): Promise<Agent> {
    const agent = await this.findOne(id);
    agent.status = status;
    return this.agentRepository.save(agent);
  }

  async chat(id: string, message: string): Promise<{ reply: string }> {
    const agent = await this.findOne(id);
    if (agent.status !== AgentStatus.ACTIVE) {
      throw new NotFoundException('Agent 当前不可用');
    }
    return this.chatWithAgent(agent, message);
  }

  async chatByType(type: AgentType, message: string): Promise<{ reply: string }> {
    const agent = await this.ensureDefaultAgent(type);
    return this.chatWithAgent(agent, message);
  }

  private async ensureDefaultAgent(type: AgentType): Promise<Agent> {
    const existing = await this.agentRepository.findOne({
      where: { type, status: AgentStatus.ACTIVE },
      order: { createdAt: 'ASC' },
    });
    if (existing) return existing;
    const names: Record<AgentType, string> = {
      [AgentType.FINANCE]: '财务 Agent',
      [AgentType.CUSTOMER_SERVICE]: '客服 Agent',
      [AgentType.LEGAL]: '法务 Agent',
      [AgentType.ADMIN]: '行政 Agent',
    };
    return this.agentRepository.save(
      this.agentRepository.create({
        name: names[type],
        type,
        status: AgentStatus.ACTIVE,
        config: {},
      }),
    );
  }

  private async chatWithAgent(agent: Agent, message: string): Promise<{ reply: string }> {
    const prompts: Record<AgentType, string> = {
      [AgentType.FINANCE]: '你是严谨的财务助理，提供记账、发票和经营分析建议，不虚构数字。',
      [AgentType.CUSTOMER_SERVICE]: '你是专业客服助理，回答清晰、友善，并在不确定时转人工。',
      [AgentType.LEGAL]: '你是法务辅助工具，识别风险并明确提示内容不构成正式法律意见。',
      [AgentType.ADMIN]: '你是行政助理，帮助拆解任务、日程和会议行动项。',
    };
    let reply: string;
    try {
      reply = await this.aiService.simpleChat(message, prompts[agent.type]);
    } catch {
      reply = this.localFallback(agent.type, message);
    }
    return { reply };
  }

  private localFallback(type: AgentType, message: string): string {
    const guides: Record<AgentType, string> = {
      [AgentType.FINANCE]:
        '我可以帮你梳理发票、记账和报表。当前 AI 服务未配置，我先给你一个操作建议：先确认金额、日期、分类和关联发票是否完整，再到财务概览核对总收入、总支出和待审发票。',
      [AgentType.CUSTOMER_SERVICE]:
        '我可以帮你整理客户问题、工单优先级和回复口径。当前 AI 服务未配置，你可以先把问题按“紧急程度、客户影响、是否需转人工”三类拆分处理。',
      [AgentType.LEGAL]:
        '我可以帮你检查合同风险和合规事项。当前 AI 服务未配置，建议先核对主体、金额、期限、违约责任、终止条款和争议解决条款。',
      [AgentType.ADMIN]:
        '我可以帮你拆解任务、日程和会议行动项。当前 AI 服务未配置，建议把事项拆成负责人、截止时间、优先级和下一步动作。',
    };
    return `${guides[type]}\n\n你刚才的问题是：“${message}”`;
  }
}
