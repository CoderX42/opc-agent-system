import { IsIn, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(50)
  type: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  balance?: number;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: string;
}
