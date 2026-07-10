import { IsNotEmpty, IsString, MinLength, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: '用户名或邮箱', example: 'john_doe' })
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty({ description: '密码', example: 'Password123!' })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: '是否保持登录（勾选后延长 refresh token 有效期）',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  rememberMe?: boolean;
}
