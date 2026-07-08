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
    if (agentType === AgentType.FINANCE) return this.selectFinanceTools(candidates, lower);

    return candidates.filter((tool) => {
      if (agentType === AgentType.CUSTOMER_SERVICE) return /客户|工单|投诉|售后|客服|customer|ticket/i.test(lower);
      if (agentType === AgentType.LEGAL) return /合同|法务|风险|合规|legal|contract/i.test(lower);
      if (agentType === AgentType.ADMIN) return /任务|日程|会议|安排|行政|schedule|task/i.test(lower);
      return false;
    });
  }

  private selectFinanceTools(candidates: AgentTool[], input: string): AgentTool[] {
    const selectedNames = new Set<string>();
    const hasIncomeIntent = /收入|营收|进账|收款|income|revenue/i.test(input);
    const hasExpenseIntent = /支出|费用|成本|付款|expense|cost/i.test(input);
    const hasAnalysisIntent = /分析|总览|摘要|利润|报表|趋势|财务|finance|summary|analysis|profit/i.test(input);

    if (hasIncomeIntent) selectedNames.add('finance.query_income');
    if (hasExpenseIntent) selectedNames.add('finance.query_expense');
    if (!selectedNames.size && hasAnalysisIntent) selectedNames.add('finance.analysis');

    return candidates.filter((tool) => selectedNames.has(tool.name));
  }

  async executeSelected(
    agentType: AgentType,
    context: AgentToolContext,
    requested?: string[],
  ): Promise<AgentToolResult[]> {
    const selected = this.select(agentType, context.input, requested).slice(0, 3);
    return Promise.all(
      selected.map(async (tool) => ({
        tool: tool.name,
        output: await tool.execute(context),
      })),
    );
  }
}
