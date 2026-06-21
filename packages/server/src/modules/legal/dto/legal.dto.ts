import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ContractStatus, ContractType } from '../entities/contract.entity';

export class CreateContractDto {
  @IsString() @MaxLength(200) title:string;
  @IsEnum(ContractType) type:ContractType;
  @IsString() @MaxLength(100_000) content:string;
  @IsOptional() @IsString() @MaxLength(100) partyA?:string;
  @IsOptional() @IsString() @MaxLength(100) partyB?:string;
  @IsOptional() @IsNumber() @Min(0) amount?:number;
  @IsOptional() @IsDateString() signDate?:string;
  @IsOptional() @IsDateString() expiryDate?:string;
}
export class UpdateContractDto extends PartialType(CreateContractDto) { @IsOptional() @IsEnum(ContractStatus) status?:ContractStatus; }
export class ContractDecisionDto { @IsBoolean() approved:boolean; @IsOptional() @IsString() @MaxLength(2000) comment?:string; }
export class CreateComplianceDto { @IsString() @MaxLength(200) title:string; @IsString() @MaxLength(50) category:string; @IsString() @MaxLength(5000) description:string; @IsOptional() @IsDateString() dueDate?:string; @IsOptional() @IsString() @MaxLength(100) responsiblePerson?:string; }
export class ComplianceStatusDto { @IsString() @MaxLength(20) status:string; }
