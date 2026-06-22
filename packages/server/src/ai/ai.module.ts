import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Knowledge } from '../modules/knowledge/entities/knowledge.entity';
import { AnthropicProvider } from './providers/anthropic.provider';
import { DeepseekProvider } from './providers/deepseek.provider';
import { OllamaProvider } from './providers/ollama.provider';
import { OpenAiCompatibleProvider } from './providers/openai-compatible.provider';
import { RagService } from './rag/rag.service';
import { AiService } from './ai.service';

@Module({
  imports: [TypeOrmModule.forFeature([Knowledge])],
  providers: [
    AnthropicProvider,
    DeepseekProvider,
    OllamaProvider,
    OpenAiCompatibleProvider,
    RagService,
    AiService,
  ],
  exports: [AiService, RagService],
})
export class AiModule {}
