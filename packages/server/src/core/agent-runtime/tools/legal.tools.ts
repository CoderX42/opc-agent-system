import { Injectable } from '@nestjs/common';
import { AgentType } from '../../../modules/agent/entities/agent.entity';
import { LegalService } from '../../../modules/legal/legal.service';
import { AgentTool, AgentToolContext } from '../agent-runtime.types';

@Injectable()
export class ContractAnalysisTool implements AgentTool {
  name = 'legal.contract_analysis';
  description = '查询合同并汇总合同审查上下文';
  supportedAgentTypes = [AgentType.LEGAL];

  constructor(private readonly legal: LegalService) {}

  async execute(context: AgentToolContext): Promise<unknown> {
    const contractId = String(context.metadata?.contractId || '');
    if (contractId) {
      return this.legal.findOneContract(context.userId, contractId);
    }
    return this.legal.findAllContracts(context.userId, 1, 10);
  }
}

@Injectable()
export class RiskDetectionTool implements AgentTool {
  name = 'legal.risk_detection';
  description = '进行合同风险检测；提供 contractId 时执行正式审查';
  supportedAgentTypes = [AgentType.LEGAL];

  constructor(private readonly legal: LegalService) {}

  async execute(context: AgentToolContext): Promise<unknown> {
    const contractId = String(context.metadata?.contractId || '');
    if (contractId) return this.legal.reviewContract(context.userId, contractId);
    return {
      riskHints: ['主体资质', '付款条件', '违约责任', '保密义务', '争议解决', '终止条款'],
      input: context.input,
    };
  }
}
