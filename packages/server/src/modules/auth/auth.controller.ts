import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthRateLimitGuard } from '../../common/guards/rate-limit.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UseGuards(AuthRateLimitGuard)
  @ApiOperation({ summary: '用户注册' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @UseGuards(AuthRateLimitGuard)
  @ApiOperation({ summary: '用户登录' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @UseGuards(AuthRateLimitGuard)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Get('me')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  getProfile(@Request() req: { user: { id: string } }) {
    return this.authService.validateUser(req.user.id);
  }

  @Post('logout')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  async logout(@Request() req: { user: { id: string } }) {
    await this.authService.logout(req.user.id);
    return null;
  }

  @Post('change-password')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Request() req: { user: { id: string } },
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(
      req.user.id,
      dto.oldPassword,
      dto.newPassword,
    );
    return null;
  }

  @Post('forgot-password')
  @UseGuards(AuthRateLimitGuard)
  @ApiOperation({ summary: '忘记密码：发送密码重置邮件' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto);
    // 无论邮箱是否存在均返回成功，避免账户枚举
    return { sent: true };
  }

  @Post('reset-password')
  @UseGuards(AuthRateLimitGuard)
  @ApiOperation({ summary: '重置密码：使用一次性令牌设置新密码' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);
    return { reset: true };
  }
}
