import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** 忘记密码请求 DTO：用户提交邮箱以接收重置链接 */
export class ForgotPasswordDto {
  @ApiProperty({ description: '注册邮箱', example: 'john@example.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;
}
