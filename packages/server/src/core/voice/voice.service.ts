import { BadRequestException, Injectable } from '@nestjs/common';
import { SupervisorAgentService } from '../agent-runtime/supervisor-agent.service';
import { VoiceChatDto } from './dto/voice-chat.dto';

@Injectable()
export class VoiceService {
  constructor(private readonly supervisor: SupervisorAgentService) {}

  async chat(userId: string, dto: VoiceChatDto) {
    const text = await this.asr(dto);
    const agentResponse = await this.supervisor.execute(userId, {
      message: text,
      sessionId: dto.sessionId,
      metadata: dto.metadata,
    });
    const tts = await this.tts(agentResponse.reply);
    return { asrText: text, reply: agentResponse.reply, plan: agentResponse.plan, tts };
  }

  private async asr(dto: VoiceChatDto): Promise<string> {
    if (dto.text?.trim()) return dto.text.trim();
    if (dto.audioUrl) {
      throw new BadRequestException('ASR Provider 尚未配置，请先传入 text 或接入语音识别服务');
    }
    throw new BadRequestException('text 或 audioUrl 至少提供一个');
  }

  private async tts(text: string): Promise<{ provider: string; audioUrl: string | null; text: string }> {
    return { provider: 'placeholder', audioUrl: null, text };
  }
}
