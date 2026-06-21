import { IsEnum, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { AgentStatus, AgentType } from '../entities/agent.entity';

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

export class AgentChatDto {
  @IsString()
  @MaxLength(10_000)
  message: string;
}
