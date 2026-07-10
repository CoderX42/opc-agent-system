import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { User, UserRole, UserStatus } from '../user/entities/user.entity';
import { MailService } from '../../common/services/mail.service';
import { randomBytes } from 'crypto';

interface TokenPayload {
  sub: string;
  username: string;
  role: UserRole;
}

/** 密码重置令牌有效期：15 分钟 */
const PASSWORD_RESET_TTL_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async register(registerDto: RegisterDto) {
    if (await this.userService.findByUsername(registerDto.username)) {
      throw new ConflictException('用户名已存在');
    }
    if (await this.userService.findByEmail(registerDto.email)) {
      throw new ConflictException('邮箱已存在');
    }

    const user = await this.userService.create(registerDto);
    return this.issueSession(user);
  }

  async login(loginDto: LoginDto) {
    const user =
      (await this.userService.findByUsername(loginDto.username)) ||
      (await this.userService.findByEmail(loginDto.username));

    if (
      !user ||
      !(await this.userService.validatePassword(loginDto.password, user.password))
    ) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('账号已被禁用');
    }
    return this.issueSession(user, loginDto.rememberMe);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<TokenPayload>(
        refreshToken,
        { secret: this.getRefreshSecret() },
      );
      const user = await this.userService.findWithRefreshToken(payload.sub);
      if (
        !user ||
        !user.refreshTokenHash ||
        user.status !== UserStatus.ACTIVE ||
        !(await this.userService.validatePassword(
          refreshToken,
          user.refreshTokenHash,
        ))
      ) {
        throw new UnauthorizedException('刷新令牌无效');
      }
      return this.issueSession(user);
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('刷新令牌无效或已过期');
    }
  }

  async logout(userId: string): Promise<void> {
    await this.userService.setRefreshToken(userId, null);
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userService.findByIdWithPassword(userId);
    if (!user || !(await this.userService.validatePassword(oldPassword, user.password))) {
      throw new UnauthorizedException('当前密码错误');
    }
    await this.userService.update(userId, { password: newPassword });
    await this.userService.setRefreshToken(userId, null);
  }

  /**
   * 发起密码重置流程：
   * 1. 按邮箱定位账户；无论是否存在均返回成功，避免泄露账户存在性。
   * 2. 生成一次性重置令牌（JWT 内嵌 userId + 随机 nonce），哈希后入库，明文通过邮件发送。
   * 3. 令牌有效期 15 分钟。
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.userService.findActiveByEmail(dto.email);
    // 未找到用户或账户非活跃时静默返回，避免账户枚举
    if (!user || user.status !== UserStatus.ACTIVE) {
      return;
    }

    // 用 JWT 包装 userId + 随机 nonce 作为重置令牌，便于后续解析定位用户
    const nonce = randomBytes(24).toString('hex');
    const plainToken = await this.jwtService.signAsync(
      { sub: user.id, nonce },
      {
        secret: this.getResetSecret(),
        expiresIn: PASSWORD_RESET_TTL_MS / 1000,
      } as JwtSignOptions,
    );
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
    await this.userService.setPasswordResetToken(user.id, plainToken, expiresAt);

    try {
      await this.mailService.sendPasswordResetEmail(user.email, plainToken);
    } catch {
      // 邮件发送失败不应向调用方暴露细节，仅记录后返回成功
    }
  }

  /**
   * 使用一次性令牌重置密码：
   * 1. 查询所有拥有重置令牌的候选用户并校验令牌与有效期。
   *    由于令牌哈希存储且 select:false，这里需要按 id 显式查询。
   *    为避免被账户枚举，调用方传入的是令牌本身；我们先解析令牌签名定位用户。
   * 2. 校验通过后更新密码、清除重置令牌与 refresh token。
   */
  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const user = await this.locateUserByResetToken(dto.token);
    if (!user || !user.passwordResetTokenHash || !user.passwordResetExpires) {
      throw new UnauthorizedException('重置令牌无效或已过期');
    }

    if (user.passwordResetExpires.getTime() < Date.now()) {
      await this.userService.clearPasswordResetToken(user.id);
      throw new UnauthorizedException('重置令牌已过期，请重新申请');
    }

    const valid = await this.userService.validatePassword(
      dto.token,
      user.passwordResetTokenHash,
    );
    if (!valid) {
      throw new UnauthorizedException('重置令牌无效或已过期');
    }

    await this.userService.update(user.id, { password: dto.newPassword });
    await this.userService.clearPasswordResetToken(user.id);
    // 密码重置后使其他会话失效
    await this.userService.setRefreshToken(user.id, null);
  }

  /**
   * 通过重置令牌定位用户。
   * 由于令牌哈希存储，无法直接按令牌查询，因此采用 JWT 包装方式：
   * 将 userId + 随机令牌签名成一个 JWT 作为重置令牌，校验时先解析 JWT 拿到 userId，
   * 再从库中取哈希进行 bcrypt 比对。
   */
  private async locateUserByResetToken(
    token: string,
  ): Promise<User | null> {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(
        token,
        { secret: this.getResetSecret() },
      );
      if (!payload?.sub) return null;
      return this.userService.findWithPasswordReset(payload.sub);
    } catch {
      return null;
    }
  }

  private getResetSecret(): string {
    const accessSecret = this.configService.getOrThrow<string>('JWT_SECRET');
    return this.configService.get<string>(
      'JWT_RESET_SECRET',
      `${accessSecret}:reset`,
    );
  }

  async validateUser(userId: string): Promise<User> {
    return this.userService.findOne(userId);
  }

  private async issueSession(user: User, rememberMe = false) {
    const payload: TokenPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };
    const token = await this.jwtService.signAsync(payload);
    // 未勾选"保持登录"时使用短有效期（1 天），勾选后延长至配置值（默认 30 天）
    const refreshTtl = rememberMe
      ? this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '30d')
      : this.configService.get<string>('JWT_REFRESH_SHORT_EXPIRES_IN', '1d');
    const refreshOptions = {
      secret: this.getRefreshSecret(),
      expiresIn: refreshTtl,
    } as unknown as JwtSignOptions;
    const refreshToken = await this.jwtService.signAsync(payload, refreshOptions);
    await this.userService.setRefreshToken(user.id, refreshToken);
    return {
      token,
      refreshToken,
      user: this.toPublicUser(user),
    };
  }

  private getRefreshSecret(): string {
    const accessSecret = this.configService.getOrThrow<string>('JWT_SECRET');
    return this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      `${accessSecret}:refresh`,
    );
  }

  private toPublicUser(user: User) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      status: user.status,
    };
  }
}
