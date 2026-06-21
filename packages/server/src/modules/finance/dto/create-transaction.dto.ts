import { IsArray, IsNotEmpty, IsNumber, IsString, IsEnum, IsDateString, IsOptional, IsUUID, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionType } from '../entities/transaction.entity';

export class CreateTransactionDto {
  @ApiProperty({ description: '交易类型', enum: TransactionType })
  @IsNotEmpty()
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiProperty({ description: '金额', example: 1000.00 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ description: '分类', example: '办公用品' })
  @IsNotEmpty()
  @IsString()
  category: string;

  @ApiProperty({ description: '交易日期', example: '2024-01-15' })
  @IsNotEmpty()
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ description: '描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '关联发票ID' })
  @IsOptional()
  @IsUUID()
  invoiceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  account?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  counterparty?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}
