import { Injectable } from '@nestjs/common';
import { AgentType } from '../../../modules/agent/entities/agent.entity';
import { AgentTool, AgentToolContext, AgentToolResult } from '../agent-runtime.types';
import { CreateAdminTaskTool, CreateScheduleTool } from './admin.tools';
import { CreateTicketTool, QueryCustomerTool } from './customer.tools';
import { FinanceAnalysisTool, QueryExpenseTool, QueryIncomeTool } from './finance.tools';
import { ContractAnalysisTool, RiskDetectionTool } from './legal.tools';

@Injectable()
export class AgentToolRegistry {
  private readonly tools: AgentTool[];

  constructor(
    queryIncome: QueryIncomeTool,
    queryExpense: QueryExpenseTool,
    financeAnalysis: FinanceAnalysisTool,
    queryCustomer: QueryCustomerTool,
    createTicket: CreateTicketTool,
    contractAnalysis: ContractAnalysisTool,
    riskDetection: RiskDetectionTool,
    createTask: CreateAdminTaskTool,
    createSchedule: CreateScheduleTool,
  ) {
    this.tools = [
      queryIncome,
      queryExpense,
      financeAnalysis,
      queryCustomer,
      createTicket,
      contractAnalysis,
      riskDetection,
      createTask,
      createSchedule,
    ];
  }

  list(agentType?: AgentType): AgentTool[] {
    return agentType
      ? this.tools.filter((tool) => tool.supportedAgentTypes.includes(agentType))
      : this.tools;
  }

  select(agentType: AgentType, input: string, requested?: string[]): AgentTool[] {
    const candidates = this.list(agentType);
    if (requested?.length) {
      return candidates.filter((tool) => requested.includes(tool.name));
    }

    const lower = input.toLowerCase();
    return candidates.filter((tool) => {
      if (agentType === AgentType.FINANCE) return /收入|支出|费用|财务|营收|成本|利润|invoice|finance/i.test(lower);
      if (agentType === AgentType.CUSTOMER_SERVICE) return /客户|工单|投诉|售后|客服|customer|ticket/i.test(lower);
      if (agentType === AgentType.LEGAL) return /合同|法务|风险|合规|legal|contract/i.test(lower);
      if (agentType === AgentType.ADMIN) return /任务|日程|会议|安排|行政|schedule|task/i.test(lower);
      return false;
    });
  }

  async executeSelected(
    agentType: AgentType,
    context: AgentToolContext,
    requested?: string[],
  ): Promise<AgentToolResult[]> {
    const selected = this.select(agentType, context.input, requested).slice(0, 3);
    const results: AgentToolResult[] = [];
    for (const tool of selected) {
      results.push({ tool: tool.name, output: await tool.execute(context) });
    }
    return results;
  }
}
