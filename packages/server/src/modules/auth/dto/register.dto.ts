import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ description: '用户名', example: 'john_doe', minLength: 3, maxLength: 50 })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username: string;

  @ApiProperty({
    description: '密码（至少 8 位，需包含字母与数字）',
    example: 'Password123!',
    minLength: 8,
    maxLength: 32,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @MaxLength(32)
  // 至少包含一个字母和一个数字，允许常见特殊字符
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).{8,32}$/, {
    message: '密码至少 8 位，且需同时包含字母与数字',
  })
  password: string;

  @ApiProperty({ description: '邮箱', example: 'john@example.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;
}
