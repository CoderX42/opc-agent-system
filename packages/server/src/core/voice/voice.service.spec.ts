import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AgentType } from '../../modules/agent/entities/agent.entity';
import { SupervisorAgentService } from '../agent-runtime/supervisor-agent.service';
import { VoiceService } from './voice.service';

describe('VoiceService', () => {
  let service: VoiceService;
  const supervisor = {
    execute: jest.fn().mockResolvedValue({
      plan: { intent: 'single_agent_assistance', agents: [AgentType.ADMIN], steps: [] },
      results: [],
      reply: '语音回复',
    }),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [VoiceService, { provide: SupervisorAgentService, useValue: supervisor }],
    }).compile();
    service = moduleRef.get(VoiceService);
    supervisor.execute.mockClear();
  });

  it('runs text through supervisor and returns tts placeholder', async () => {
    const result = await service.chat('user-id', { text: '安排会议' });

    expect(supervisor.execute).toHaveBeenCalledWith('user-id', {
      message: '安排会议',
      sessionId: undefined,
      metadata: undefined,
    });
    expect(result.tts.provider).toBe('placeholder');
  });

  it('requires text while asr provider is not configured', async () => {
    await expect(service.chat('user-id', { audioUrl: 'file.wav' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
