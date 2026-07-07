import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { AgentStatus, AgentType } from '../entities/agent.entity';
import { AGENT_PROVIDER_PRESETS } from '../agent-model-config';

export class CreateAgentDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsEnum(AgentType)
  type: AgentType;

  @IsOptional()
  @IsEnum(AgentStatus)
  status?: AgentStatus;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

export class UpdateAgentDto extends PartialType(CreateAgentDto) {}

export class UpdateAgentModelConfigDto {
  @IsIn(AGENT_PROVIDER_PRESETS.map((preset) => preset.value))
  provider: string;

  @IsString()
  @MaxLength(120)
  model: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  apiKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  baseUrl?: string;

  @IsNumber()
  @Min(0)
  @Max(2)
  temperature: number;

  @IsNumber()
  @Min(1)
  @Max(200000)
  maxTokens: number;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  systemPrompt?: string;

  @IsBoolean()
  enableMemory: boolean;

  @IsBoolean()
  enableTools: boolean;

  @IsOptional()
  @IsBoolean()
  apiKeyRequired?: boolean;
}

export class AgentChatDto {
  @IsString()
  @MaxLength(10_000)
  message: string;
}

export class TestAgentConnectionDto {
  @IsIn(AGENT_PROVIDER_PRESETS.map((preset) => preset.value))
  provider: string;

  @IsString()
  @MaxLength(120)
  model: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  apiKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  baseUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(64)
  maxTokens?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;
}
