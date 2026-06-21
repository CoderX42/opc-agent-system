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
import { User, UserRole, UserStatus } from '../user/entities/user.entity';

interface TokenPayload {
  sub: string;
  username: string;
  role: UserRole;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
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
    return this.issueSession(user);
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

  async validateUser(userId: string): Promise<User> {
    return this.userService.findOne(userId);
  }

  private async issueSession(user: User) {
    const payload: TokenPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };
    const token = await this.jwtService.signAsync(payload);
    const refreshOptions = {
      secret: this.getRefreshSecret(),
      expiresIn: this.configService.get<string>(
        'JWT_REFRESH_EXPIRES_IN',
        '30d',
      ),
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
