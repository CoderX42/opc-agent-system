import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { AgentType } from '../entities/agent.entity';

export class AgentQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Agent 类型',
    enum: AgentType,
  })
  @IsOptional()
  @IsEnum(AgentType)
  type?: AgentType;

  @ApiPropertyOptional({
    description: 'Agent 名称（模糊搜索）',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Agent 状态',
  })
  @IsOptional()
  @IsString()
  status?: string;
}
