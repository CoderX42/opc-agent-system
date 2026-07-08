import { Injectable } from '@nestjs/common';
import { AgentType } from '../../../modules/agent/entities/agent.entity';
import { TransactionType } from '../../../modules/finance/entities/transaction.entity';
import { FinanceService } from '../../../modules/finance/finance.service';
import { AgentTool, AgentToolContext } from '../agent-runtime.types';

@Injectable()
export class QueryIncomeTool implements AgentTool {
  name = 'finance.query_income';
  description = '查询当前用户收入、发票和财务摘要';
  supportedAgentTypes = [AgentType.FINANCE];

  constructor(private readonly finance: FinanceService) {}

  async execute(context: AgentToolContext): Promise<unknown> {
    const summary = await this.finance.getFinancialSummary(context.userId);
    const transactions = await this.finance.findAllTransactions(
      context.userId,
      1,
      20,
      TransactionType.INCOME,
    );
    return { summary, transactions };
  }
}

@Injectable()
export class QueryExpenseTool implements AgentTool {
  name = 'finance.query_expense';
  description = '查询当前用户支出和财务摘要';
  supportedAgentTypes = [AgentType.FINANCE];

  constructor(private readonly finance: FinanceService) {}

  async execute(context: AgentToolContext): Promise<unknown> {
    const summary = await this.finance.getFinancialSummary(context.userId);
    const transactions = await this.finance.findAllTransactions(
      context.userId,
      1,
      20,
      TransactionType.EXPENSE,
    );
    return { summary, transactions };
  }
}

@Injectable()
export class FinanceAnalysisTool implements AgentTool {
  name = 'finance.analysis';
  description = '获取财务分析所需的总览、近期交易和 Agent 上下文';
  supportedAgentTypes = [AgentType.FINANCE];

  constructor(private readonly finance: FinanceService) {}

  async execute(context: AgentToolContext): Promise<unknown> {
    return this.finance.getAgentContext(context.userId);
  }
}
