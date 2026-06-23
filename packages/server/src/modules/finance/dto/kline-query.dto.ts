import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export type KlineDimension = 'daily' | 'monthly' | 'yearly';

export class KlineQueryDto {
  @ApiPropertyOptional({
    enum: ['daily', 'monthly', 'yearly'],
    default: 'monthly',
    description: 'K线时间维度',
  })
  @IsOptional()
  @IsIn(['daily', 'monthly', 'yearly'])
  dimension?: KlineDimension = 'monthly';

  @ApiPropertyOptional({
    default: 365,
    minimum: 30,
    maximum: 3650,
    description: '查询窗口(天)',
  })
  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(3650)
  rangeDays?: number = 365;
}

export class KlineDetailQueryDto {
  @ApiPropertyOptional({
    enum: ['daily', 'monthly', 'yearly'],
    default: 'daily',
    description: 'K线时间维度',
  })
  @IsOptional()
  @IsIn(['daily', 'monthly', 'yearly'])
  dimension?: KlineDimension = 'daily';

  @ApiPropertyOptional({
    description: 'K线周期标签，例如 2026-06-23、2026-06、2026年',
  })
  @IsString()
  period: string;
}
