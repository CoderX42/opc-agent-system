import { Module } from '@nestjs/common';
import { AgentRuntimeModule } from '../agent-runtime/agent-runtime.module';
import { VoiceController } from './voice.controller';
import { VoiceService } from './voice.service';

@Module({
  imports: [AgentRuntimeModule],
  controllers: [VoiceController],
  providers: [VoiceService],
})
export class VoiceModule {}
