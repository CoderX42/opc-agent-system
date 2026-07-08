import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from '../../ai/ai.service';
import {
  Agent,
  AgentStatus,
  AgentType,
} from '../../modules/agent/entities/agent.entity';
import {
  defaultAgentConfig,
  normalizeAgentConfig,
  toAiProviderType,
} from '../../modules/agent/agent-model-config';
import {
  AgentExecutionInput,
  AgentExecutionResult,
  AgentReference,
} from './agent-runtime.types';
import { AgentTaskService } from './agent-task.service';
import { AgentTaskStatus } from './entities/agent-task.entity';
import { AgentMemoryType } from './entities/agent-memory.entity';
import { AgentMemoryService } from './memory/agent-memory.service';
import { KnowledgeVectorService } from './rag/knowledge-vector.service';
import { AgentToolRegistry } from './tools/agent-tool-registry.service';

@Injectable()
export class AgentExecutor {
  private readonly logger = new Logger(AgentExecutor.name);

  constructor(
    @InjectRepository(Agent)
    private readonly agents: Repository<Agent>,
    private readonly ai: AiService,
    private readonly tasks: AgentTaskService,
    private readonly memory: AgentMemoryService,
    private readonly knowledge: KnowledgeVectorService,
    private readonly tools: AgentToolRegistry,
  ) {}

  async execute(input: AgentExecutionInput): Promise<AgentExecutionResult> {
    const agent = await this.resolveAgent(input.agentId, input.agentType);
    const agentType = agent?.type || input.agentType || AgentType.ADMIN;
    const task = input.taskId
      ? await this.tasks.findOne(input.taskId)
      : await this.tasks.create({
          userId: input.userId,
          agentId: agent?.id,
          agentType,
          taskType: input.taskType,
          payload: this.toTaskInput(input),
        });

    try {
      await this.tasks.updateStatus(task.id, AgentTaskStatus.PLANNING, {
        agentId: agent?.id || null,
        agentType,
        plan: {
          steps: ['load_prompt', 'load_memory', 'retrieve_knowledge', 'execute_tools', 'call_llm', 'save_result'],
        },
      });

      const rawConfig = agent?.config || (defaultAgentConfig(agentType) as unknown as Record<string, unknown>);
      const config = normalizeAgentConfig(agentType, rawConfig);
      await this.memory.appendShortTerm(input.userId, input.sessionId, 'user', input.message);

      const [memoryContext, knowledgeResults] = await Promise.all([
        this.memory.getContext({
          userId: input.userId,
          agentId: agent?.id,
          sessionId: input.sessionId,
          query: input.message,
        }),
        this.knowledge.search(input.message, 5),
      ]);

      await this.tasks.updateStatus(task.id, AgentTaskStatus.TOOL_CALLING);
      const toolResults = await this.tools.executeSelected(
        agentType,
        {
          userId: input.userId,
          agentType,
          taskId: task.id,
          input: input.message,
          metadata: input.metadata,
        },
        input.tools,
      );

      await this.tasks.updateStatus(task.id, AgentTaskStatus.RUNNING);
      const systemPrompt = this.buildSystemPrompt(config.systemPrompt, agentType);
      const userPrompt = this.buildUserPrompt(
        input.message,
        memoryContext.shortTerm,
        memoryContext.longTerm.map((item) => `${item.memoryType}:${item.key}=${item.content}`),
        knowledgeResults,
        toolResults,
      );

      const reply = await this.callLlm(userPrompt, systemPrompt, config);
      const references: AgentReference[] = knowledgeResults.map((item) => ({
        id: item.id,
        title: item.title,
        category: item.category,
        relevanceScore: item.relevanceScore,
      }));

      const completed = await this.tasks.updateStatus(task.id, AgentTaskStatus.COMPLETED, {
        result: { reply, references, toolResults },
      });

      await Promise.all([
        this.memory.appendShortTerm(input.userId, input.sessionId, 'assistant', reply),
        this.memory.upsertLongTerm({
          userId: input.userId,
          agentId: agent?.id,
          memoryType: AgentMemoryType.CONVERSATION_SUMMARY,
          scope: input.sessionId || 'runtime',
          key: `task:${task.id}`,
          content: reply.slice(0, 2000),
          metadata: { taskType: input.taskType, agentType },
          importance: 2,
        }),
      ]);

      return { task: completed, reply, agentType, toolResults, references };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Agent task failed: ${message}`);
      const failed = await this.tasks.updateStatus(task.id, AgentTaskStatus.FAILED, {
        error: message,
      });
      return {
        task: failed,
        reply: this.localFallback(agentType, input.message, message),
        agentType,
        toolResults: [],
        references: [],
      };
    }
  }

  private async resolveAgent(agentId?: string, agentType?: AgentType): Promise<Agent | null> {
    if (agentId) {
      const agent = await this.agents.findOne({ where: { id: agentId } });
      if (!agent) throw new NotFoundException(`Agent #${agentId} not found`);
      if (agent.status !== AgentStatus.ACTIVE) throw new NotFoundException('Agent 当前不可用');
      return agent;
    }
    if (!agentType) return null;
    return this.agents.findOne({
      where: { type: agentType, status: AgentStatus.ACTIVE },
      order: { createdAt: 'ASC' },
    });
  }

  private buildSystemPrompt(basePrompt: string | undefined, agentType: AgentType): string {
    return [
      basePrompt,
      `你是企业级 ${agentType} Agent。请优先使用系统提供的业务数据、记忆、知识库和工具结果。`,
      '不要编造数据库中不存在的事实；如信息不足，请明确说明缺口并给出下一步。',
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  private buildUserPrompt(
    message: string,
    shortTerm: string[],
    longTerm: string[],
    knowledge: { title: string; content: string; category: string }[],
    toolResults: { tool: string; output: unknown }[],
  ): string {
    return [
      `用户请求：${message}`,
      shortTerm.length ? `短期记忆：\n${shortTerm.join('\n')}` : '',
      longTerm.length ? `长期记忆：\n${longTerm.join('\n')}` : '',
      knowledge.length
        ? `知识库：\n${knowledge.map((item, index) => `${index + 1}. ${item.title}(${item.category})\n${item.content}`).join('\n\n')}`
        : '',
      toolResults.length ? `工具结果：\n${JSON.stringify(toolResults, null, 2)}` : '',
      '请输出结构化、可执行的中文答复。',
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  private async callLlm(
    userPrompt: string,
    systemPrompt: string,
    config: ReturnType<typeof normalizeAgentConfig>,
  ): Promise<string> {
    try {
      return await this.ai.simpleChat(userPrompt, systemPrompt, {
        provider: toAiProviderType(config),
        model: config.model,
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        providerLabel: config.provider,
        apiKeyRequired: config.apiKeyRequired,
      });
    } catch (error) {
      this.logger.warn(`LLM failed, using runtime fallback: ${String(error)}`);
      return `Agent Runtime 已完成上下文组装，但 LLM 调用不可用：${String(error)}\n\n${userPrompt.slice(0, 1000)}`;
    }
  }

  private toTaskInput(input: AgentExecutionInput): Record<string, unknown> {
    return {
      message: input.message,
      sessionId: input.sessionId,
      metadata: input.metadata || {},
      requestedTools: input.tools || [],
    };
  }

  private localFallback(agentType: AgentType, message: string, reason: string): string {
    return `当前 ${agentType} Agent Runtime 已完成任务编排，但 LLM 调用不可用：${reason}\n\n已接收请求：“${message.slice(0, 500)}”。请检查模型配置后重试。`;
  }
}
