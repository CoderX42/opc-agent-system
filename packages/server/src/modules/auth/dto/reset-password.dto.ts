import { IsNotEmpty, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** 重置密码请求 DTO：携带一次性重置令牌并设置新密码 */
export class ResetPasswordDto {
  @ApiProperty({ description: '密码重置令牌' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    description: '新密码（至少 8 位，需包含字母与数字）',
    example: 'Password123!',
    minLength: 8,
    maxLength: 32,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(32)
  // 至少包含一个字母和一个数字，允许常见特殊字符
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).{8,32}$/, {
    message: '密码至少 8 位，且需同时包含字母与数字',
  })
  newPassword: string;
}
