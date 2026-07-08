import { Injectable } from '@nestjs/common';
import { AgentType } from '../../modules/agent/entities/agent.entity';
import { AgentExecutionResult, SupervisorPlan } from './agent-runtime.types';
import { AgentExecutor } from './agent-executor.service';
import { SupervisorTaskDto } from './dto/agent-runtime.dto';

@Injectable()
export class SupervisorAgentService {
  constructor(private readonly executor: AgentExecutor) {}

  plan(message: string): SupervisorPlan {
    const agents = this.route(message);
    const intent = this.detectIntent(message, agents);
    return {
      intent,
      agents,
      steps: agents.map((agentType) => ({
        agentType,
        taskType: this.taskTypeFor(agentType, intent),
        reason: this.reasonFor(agentType, message),
      })),
    };
  }

  async execute(
    userId: string,
    dto: SupervisorTaskDto,
  ): Promise<{ plan: SupervisorPlan; results: AgentExecutionResult[]; reply: string }> {
    const plan = this.plan(dto.message);
    const results: AgentExecutionResult[] = [];

    for (const step of plan.steps) {
      results.push(
        await this.executor.execute({
          userId,
          agentType: step.agentType,
          taskType: step.taskType,
          message: dto.message,
          sessionId: dto.sessionId,
          metadata: { ...(dto.metadata || {}), supervisorIntent: plan.intent, reason: step.reason },
        }),
      );
    }

    return { plan, results, reply: this.mergeReplies(plan, results) };
  }

  private route(message: string): AgentType[] {
    const rules: { agentType: AgentType; pattern: RegExp }[] = [
      { agentType: AgentType.CUSTOMER_SERVICE, pattern: /客户|合作|工单|投诉|售后|关系|customer/i },
      { agentType: AgentType.LEGAL, pattern: /法务|合同|合规|风险|条款|legal|contract/i },
      { agentType: AgentType.FINANCE, pattern: /财务|收入|支出|利润|成本|账款|付款|发票|finance/i },
      { agentType: AgentType.ADMIN, pattern: /任务|日程|会议|安排|行政|schedule|task/i },
    ];
    const matched = rules
      .filter((rule) => rule.pattern.test(message))
      .map((rule) => rule.agentType);

    if (/客户.*风险|合作.*风险|风险.*客户|合作.*评估/.test(message)) {
      return [AgentType.CUSTOMER_SERVICE, AgentType.LEGAL, AgentType.FINANCE];
    }

    return matched.length > 0 ? [...new Set(matched)] : [AgentType.ADMIN];
  }

  private detectIntent(message: string, agents: AgentType[]): string {
    if (/风险|合规|审查|评估/.test(message)) return 'risk_analysis';
    if (/创建|新增|安排/.test(message)) return 'operation_create';
    if (/查询|统计|分析/.test(message)) return 'business_analysis';
    return agents.length > 1 ? 'multi_agent_collaboration' : 'single_agent_assistance';
  }

  private taskTypeFor(agentType: AgentType, intent: string): string {
    return `${agentType.toLowerCase()}_${intent}`;
  }

  private reasonFor(agentType: AgentType, message: string): string {
    const reasons: Record<AgentType, string> = {
      [AgentType.CUSTOMER_SERVICE]: '识别客户、合作或工单上下文',
      [AgentType.LEGAL]: '识别合同、合规或法律风险',
      [AgentType.FINANCE]: '识别收入、支出、成本或付款风险',
      [AgentType.ADMIN]: '识别任务、日程或行政执行事项',
    };
    return `${reasons[agentType]}：${message.slice(0, 80)}`;
  }

  private mergeReplies(plan: SupervisorPlan, results: AgentExecutionResult[]): string {
    const sections = results
      .map((result) => `## ${result.agentType}\n${result.reply}`)
      .join('\n\n');
    return `Supervisor 已识别意图：${plan.intent}\n协作 Agent：${plan.agents.join(', ')}\n\n${sections}`;
  }
}
