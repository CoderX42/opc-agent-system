import { IsNotEmpty, IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContractType } from '../entities/contract.entity';

export class ReviewContractDto {
  @ApiProperty({ description: '合同ID' })
  @IsNotEmpty()
  @IsString()
  contractId: string;

  @ApiPropertyOptional({ description: '审查重点' })
  @IsOptional()
  @IsString()
  focusAreas?: string;

  @ApiPropertyOptional({ description: '合同类型' })
  @IsOptional()
  @IsEnum(ContractType)
  type?: ContractType;
}
