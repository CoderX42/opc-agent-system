import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Knowledge } from '../modules/knowledge/entities/knowledge.entity';
import { DeepseekProvider } from './providers/deepseek.provider';
import { OllamaProvider } from './providers/ollama.provider';
import { RagService } from './rag/rag.service';
import { AiService } from './ai.service';

@Module({
  imports: [TypeOrmModule.forFeature([Knowledge])],
  providers: [DeepseekProvider, OllamaProvider, RagService, AiService],
  exports: [AiService, RagService],
})
export class AiModule {}
