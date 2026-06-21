import { IsNotEmpty, IsString, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority } from '../entities/task.entity';

export class CreateTaskDto {
  @ApiProperty({ description: '任务标题', example: '完成月度报告' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: '任务描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: '优先级',
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
  })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ description: '截止日期', example: '2024-01-31' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: '指派人ID' })
  @IsOptional()
  @IsString()
  assigneeId?: string;
}
