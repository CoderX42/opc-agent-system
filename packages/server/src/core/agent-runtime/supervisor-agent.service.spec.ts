import { Test } from '@nestjs/testing';
import { AgentType } from '../../modules/agent/entities/agent.entity';
import { AgentExecutor } from './agent-executor.service';
import { SupervisorAgentService } from './supervisor-agent.service';

describe('SupervisorAgentService', () => {
  let service: SupervisorAgentService;
  const executor = { execute: jest.fn() };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        SupervisorAgentService,
        { provide: AgentExecutor, useValue: executor },
      ],
    }).compile();
    service = moduleRef.get(SupervisorAgentService);
    executor.execute.mockReset();
  });

  it('routes customer cooperation risk to customer, legal and finance agents', () => {
    const plan = service.plan('分析客户合作风险');

    expect(plan.intent).toBe('risk_analysis');
    expect(plan.agents).toEqual([
      AgentType.CUSTOMER_SERVICE,
      AgentType.LEGAL,
      AgentType.FINANCE,
    ]);
  });

  it('executes every planned agent step', async () => {
    executor.execute.mockResolvedValue({
      task: { id: 'task-id' },
      reply: 'ok',
      agentType: AgentType.ADMIN,
      toolResults: [],
      references: [],
    });

    const result = await service.execute('user-id', { message: '创建任务', sessionId: 's1' });

    expect(executor.execute).toHaveBeenCalledTimes(1);
    expect(result.reply).toContain('Supervisor 已识别意图');
  });
});
