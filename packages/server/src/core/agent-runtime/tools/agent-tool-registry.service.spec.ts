import { AgentType } from '../../../modules/agent/entities/agent.entity';
import { AgentToolRegistry } from './agent-tool-registry.service';

const makeTool = (name: string, supportedAgentTypes: AgentType[]) => ({
  name,
  supportedAgentTypes,
  description: name,
  execute: jest.fn(),
});

describe('AgentToolRegistry', () => {
  it('selects finance tools for finance input', () => {
    const finance = makeTool('finance.analysis', [AgentType.FINANCE]);
    const registry = new AgentToolRegistry(
      makeTool('finance.query_income', [AgentType.FINANCE]) as never,
      makeTool('finance.query_expense', [AgentType.FINANCE]) as never,
      finance as never,
      makeTool('customer.query', [AgentType.CUSTOMER_SERVICE]) as never,
      makeTool('customer.create_ticket', [AgentType.CUSTOMER_SERVICE]) as never,
      makeTool('legal.contract_analysis', [AgentType.LEGAL]) as never,
      makeTool('legal.risk_detection', [AgentType.LEGAL]) as never,
      makeTool('admin.create_task', [AgentType.ADMIN]) as never,
      makeTool('admin.create_schedule', [AgentType.ADMIN]) as never,
    );

    expect(registry.select(AgentType.FINANCE, '分析收入和支出').length).toBeGreaterThan(0);
  });
});
