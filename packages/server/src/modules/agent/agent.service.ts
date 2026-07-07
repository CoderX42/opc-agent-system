import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent, AgentStatus, AgentType } from './entities/agent.entity';
import { AgentQueryDto } from './dto/agent-query.dto';
import { AiService } from '../../ai/ai.service';
import { CreateAgentDto, UpdateAgentDto, UpdateAgentModelConfigDto } from './dto/agent.dto';
import {
  AGENT_PROVIDER_PRESETS,
  AgentModelConfig,
  defaultAgentConfig,
  getProviderPreset,
  mergeAgentConfig,
  normalizeAgentConfig,
  sanitizeAgentConfig,
  toAiProviderType,
} from './agent-model-config';

type SafeAgent = Omit<Agent, 'config'> & { config: AgentModelConfig };

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
    private readonly aiService: AiService,
  ) {}

  async create(data: CreateAgentDto): Promise<SafeAgent> {
    const agent = this.agentRepository.create({
      ...data,
      config: (data.config || defaultAgentConfig(data.type)) as Record<string, unknown>,
    });
    const saved = await this.agentRepository.save(agent);
    return this.toSafeAgent(saved);
  }

  async findAll(query: AgentQueryDto): Promise<{ items: SafeAgent[]; total: number }> {
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
    return { items: items.map((agent) => this.toSafeAgent(agent)), total };
  }

  async findOne(id: string): Promise<SafeAgent> {
    const agent = await this.findRawOne(id);
    return this.toSafeAgent(agent);
  }

  async findRawOne(id: string): Promise<Agent> {
    const agent = await this.agentRepository.findOne({ where: { id } });
    if (!agent) {
      throw new NotFoundException(`Agent #${id} not found`);
    }
    return agent;
  }

  async findByType(type: AgentType): Promise<SafeAgent[]> {
    const agents = await this.agentRepository.find({
      where: { type, status: AgentStatus.ACTIVE },
    });
    return agents.map((agent) => this.toSafeAgent(agent));
  }

  async update(id: string, data: UpdateAgentDto): Promise<SafeAgent> {
    const agent = await this.findRawOne(id);
    const previousConfig = agent.config;
    Object.assign(agent, data);
    if (data.config) {
      agent.config = mergeAgentConfig(
        agent.type,
        previousConfig,
        data.config,
      ) as unknown as Record<string, unknown>;
    }
    const saved = await this.agentRepository.save(agent);
    return this.toSafeAgent(saved);
  }

  async remove(id: string): Promise<void> {
    const agent = await this.findRawOne(id);
    await this.agentRepository.remove(agent);
  }

  async getActiveAgents(): Promise<SafeAgent[]> {
    const agents = await this.agentRepository.find({
      where: { status: AgentStatus.ACTIVE },
    });
    return agents.map((agent) => this.toSafeAgent(agent));
  }

  async getConfigurableAgents(): Promise<SafeAgent[]> {
    const agents = await Promise.all(
      Object.values(AgentType).map((type) => this.ensureDefaultAgent(type)),
    );
    return agents.map((agent) => this.toSafeAgent(agent));
  }

  async setStatus(id: string, status: AgentStatus): Promise<SafeAgent> {
    const agent = await this.findRawOne(id);
    agent.status = status;
    const saved = await this.agentRepository.save(agent);
    return this.toSafeAgent(saved);
  }

  getModelPresets() {
    return AGENT_PROVIDER_PRESETS;
  }

  async testConnection(payload: {
    provider: string;
    model: string;
    apiKey?: string;
    baseUrl?: string;
    maxTokens?: number;
    temperature?: number;
  }): Promise<{
    ok: boolean;
    latencyMs: number;
    reply?: string;
    error?: string;
    provider: string;
    model: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    tokensPerSec?: number;
  }> {
    const startedAt = Date.now();
    const preset = getProviderPreset(payload.provider);
    const providerType = toAiProviderType({
      provider: preset.value as never,
      model: payload.model,
      temperature: payload.temperature ?? 0,
      maxTokens: payload.maxTokens ?? 64,
      enableMemory: false,
      enableTools: false,
    } as AgentModelConfig);
    try {
      const response = await this.aiService.chat(
        [{ role: 'user', content: '请用一句话证明服务可用，保持不超过 20 个字。' }],
        {
          provider: providerType,
          model: payload.model,
          apiKey: payload.apiKey,
          baseUrl: payload.baseUrl || preset.defaultBaseUrl,
          temperature: payload.temperature ?? 0,
          maxTokens: payload.maxTokens ?? 64,
          providerLabel: preset.value,
          apiKeyRequired: preset.apiKeyRequired,
        },
      );
      const latencyMs = Date.now() - startedAt;
      const completionTokens = response.usage?.completionTokens || 0;
      const promptTokens = response.usage?.promptTokens || 0;
      const totalTokens = response.usage?.totalTokens || promptTokens + completionTokens;
      const tokensPerSec =
        completionTokens > 0 && latencyMs > 0
          ? Number(((completionTokens / latencyMs) * 1000).toFixed(2))
          : undefined;
      return {
        ok: true,
        latencyMs,
        reply: String(response.content || '').slice(0, 200),
        provider: preset.value,
        model: payload.model,
        promptTokens,
        completionTokens,
        totalTokens,
        tokensPerSec,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`testConnection failed for ${preset.value}/${payload.model}: ${msg}`);
      return {
        ok: false,
        latencyMs: Date.now() - startedAt,
        error: msg,
        provider: preset.value,
        model: payload.model,
      };
    }
  }

  async updateModelConfig(
    id: string,
    data: UpdateAgentModelConfigDto,
  ): Promise<SafeAgent> {
    const agent = await this.findRawOne(id);
    agent.config = mergeAgentConfig(
      agent.type,
      agent.config,
      data as Partial<AgentModelConfig>,
    ) as unknown as Record<string, unknown>;
    const saved = await this.agentRepository.save(agent);
    return this.toSafeAgent(saved);
  }

  async chat(id: string, message: string): Promise<{ reply: string }> {
    const agent = await this.findRawOne(id);
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
      where: { type },
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
        config: defaultAgentConfig(type) as unknown as Record<string, unknown>,
      }),
    );
  }

  private async chatWithAgent(agent: Agent, message: string): Promise<{ reply: string }> {
    const config = normalizeAgentConfig(agent.type, agent.config);
    const reply = await this.aiService.simpleChat(message, config.systemPrompt, {
      provider: toAiProviderType(config),
      model: config.model,
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      providerLabel: config.provider,
      apiKeyRequired: config.apiKeyRequired,
    });
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

  private toSafeAgent(agent: Agent): SafeAgent {
    return {
      ...agent,
      config: sanitizeAgentConfig(normalizeAgentConfig(agent.type, agent.config)),
    };
  }
}
