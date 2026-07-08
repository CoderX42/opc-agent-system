import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { AgentType } from '../../../modules/agent/entities/agent.entity';
import { AgentMemoryType } from '../entities/agent-memory.entity';

export class ExecuteAgentTaskDto {
  @ApiPropertyOptional({ description: '指定 Agent ID；不传则由类型或 Supervisor 路由' })
  @IsOptional()
  @IsUUID()
  agentId?: string;

  @ApiPropertyOptional({ enum: AgentType, description: '指定 Agent 类型' })
  @IsOptional()
  @IsEnum(AgentType)
  agentType?: AgentType;

  @ApiProperty({ description: '任务类型', example: 'risk_analysis' })
  @IsString()
  @MaxLength(80)
  taskType: string;

  @ApiProperty({ description: '用户输入' })
  @IsString()
  @MaxLength(20_000)
  message: string;

  @ApiPropertyOptional({ description: '会话 ID，用于短期记忆' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  sessionId?: string;

  @ApiPropertyOptional({ description: '额外输入上下文' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ description: '允许调用的工具名称' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tools?: string[];
}

export class SupervisorTaskDto {
  @ApiProperty({ description: '用户输入' })
  @IsString()
  @MaxLength(20_000)
  message: string;

  @ApiPropertyOptional({ description: '会话 ID' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  sessionId?: string;

  @ApiPropertyOptional({ description: '业务上下文' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpsertAgentMemoryDto {
  @ApiProperty({ enum: AgentMemoryType })
  @IsEnum(AgentMemoryType)
  memoryType: AgentMemoryType;

  @ApiPropertyOptional({ description: '关联 Agent ID' })
  @IsOptional()
  @IsUUID()
  agentId?: string;

  @ApiPropertyOptional({ default: 'default' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  scope?: string;

  @ApiProperty({ description: '记忆键' })
  @IsString()
  @MaxLength(160)
  key: string;

  @ApiProperty({ description: '记忆内容' })
  @IsString()
  @MaxLength(20_000)
  content: string;

  @ApiPropertyOptional({ description: '重要度 1-10' })
  @IsOptional()
  importance?: number;

  @ApiPropertyOptional({ description: '元数据' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateAgentMemoryDto extends PartialType(UpsertAgentMemoryDto) {}
