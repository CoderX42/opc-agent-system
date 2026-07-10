import { Test, type TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { MailService } from '../../common/services/mail.service';
import {
  User,
  UserRole,
  UserStatus,
} from '../user/entities/user.entity';

/**
 * AuthService 单元测试，聚焦本次新增/增强的能力：
 * - 注册（用户名/邮箱冲突）
 * - 登录 rememberMe 影响 refresh token 有效期
 * - 忘记密码（账户不存在时静默成功，账户存在时生成令牌并发邮件）
 * - 重置密码（令牌无效/过期/有效三种路径）
 */
describe('AuthService', () => {
  let service: AuthService;
  let userService: jest.Mocked<Pick<
    UserService,
    | 'findByUsername'
    | 'findByEmail'
    | 'findActiveByEmail'
    | 'create'
    | 'validatePassword'
    | 'setRefreshToken'
    | 'setPasswordResetToken'
    | 'clearPasswordResetToken'
    | 'findWithPasswordReset'
    | 'update'
    | 'findByIdWithPassword'
  >>;
  let jwtService: jest.Mocked<Pick<JwtService, 'signAsync' | 'verifyAsync'>>;
  let mailService: jest.Mocked<Pick<MailService, 'sendPasswordResetEmail'>>;
  let configService: {
    get: jest.Mock;
    getOrThrow: jest.Mock;
  };

  const baseUser: User = {
    id: 'user-1',
    username: 'alice',
    email: 'alice@example.com',
    password: 'hashed-pw',
    role: UserRole.USER,
    avatar: undefined as unknown as string,
    status: UserStatus.ACTIVE,
    refreshTokenHash: null,
    passwordResetTokenHash: null,
    passwordResetExpires: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    userService = {
      findByUsername: jest.fn(),
      findByEmail: jest.fn(),
      findActiveByEmail: jest.fn(),
      create: jest.fn(),
      validatePassword: jest.fn(),
      setRefreshToken: jest.fn(),
      setPasswordResetToken: jest.fn(),
      clearPasswordResetToken: jest.fn(),
      findWithPasswordReset: jest.fn(),
      update: jest.fn(),
      findByIdWithPassword: jest.fn(),
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('mock-token'),
      verifyAsync: jest.fn(),
    };

    mailService = {
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    };

    configService = {
      get: jest.fn().mockImplementation((key: string, fallback?: string) => {
        if (key === 'JWT_SECRET') return 'test-secret';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '30d';
        if (key === 'JWT_REFRESH_SHORT_EXPIRES_IN') return '1d';
        return fallback ?? '';
      }),
      getOrThrow: jest.fn().mockReturnValue('test-secret') as jest.Mock,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: userService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('register', () => {
    it('throws ConflictException when username already exists', async () => {
      userService.findByUsername.mockResolvedValue(baseUser);
      await expect(
        service.register({
          username: 'alice',
          email: 'new@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(ConflictException);
      expect(userService.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when email already exists', async () => {
      userService.findByUsername.mockResolvedValue(null);
      userService.findByEmail.mockResolvedValue(baseUser);
      await expect(
        service.register({
          username: 'newuser',
          email: 'alice@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates user and issues a session on success', async () => {
      userService.findByUsername.mockResolvedValue(null);
      userService.findByEmail.mockResolvedValue(null);
      userService.create.mockResolvedValue(baseUser);
      userService.setRefreshToken.mockResolvedValue(undefined);

      const result = await service.register({
        username: 'alice',
        email: 'alice@example.com',
        password: 'Password123!',
      });

      expect(userService.create).toHaveBeenCalled();
      expect(result).toEqual({
        token: 'mock-token',
        refreshToken: 'mock-token',
        user: expect.objectContaining({ id: 'user-1' }),
      });
    });
  });

  describe('login with rememberMe', () => {
    it('issues a short-lived refresh token when rememberMe is false', async () => {
      userService.findByUsername.mockResolvedValue(baseUser);
      userService.validatePassword.mockResolvedValue(true);
      userService.setRefreshToken.mockResolvedValue(undefined);

      await service.login({
        username: 'alice',
        password: 'Password123!',
        rememberMe: false,
      });

      const refreshCall = jwtService.signAsync.mock.calls[1];
      const options = refreshCall?.[1] as { expiresIn: string };
      expect(options.expiresIn).toBe('1d');
    });

    it('issues a long-lived refresh token when rememberMe is true', async () => {
      userService.findByUsername.mockResolvedValue(baseUser);
      userService.validatePassword.mockResolvedValue(true);
      userService.setRefreshToken.mockResolvedValue(undefined);

      await service.login({
        username: 'alice',
        password: 'Password123!',
        rememberMe: true,
      });

      const refreshCall = jwtService.signAsync.mock.calls[1];
      const options = refreshCall?.[1] as { expiresIn: string };
      expect(options.expiresIn).toBe('30d');
    });
  });

  describe('forgotPassword', () => {
    it('silently returns when email is not registered (no enumeration)', async () => {
      userService.findActiveByEmail.mockResolvedValue(null);
      await service.forgotPassword({ email: 'unknown@example.com' });
      expect(userService.setPasswordResetToken).not.toHaveBeenCalled();
      expect(mailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('generates a reset token, stores its hash and sends email', async () => {
      userService.findActiveByEmail.mockResolvedValue(baseUser);
      userService.setPasswordResetToken.mockResolvedValue(undefined);

      await service.forgotPassword({ email: 'alice@example.com' });

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'user-1' }),
        expect.objectContaining({ secret: expect.any(String) }),
      );
      expect(userService.setPasswordResetToken).toHaveBeenCalledWith(
        'user-1',
        'mock-token',
        expect.any(Date),
      );
      expect(mailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'alice@example.com',
        'mock-token',
      );
    });

    it('does not throw when mail sending fails', async () => {
      userService.findActiveByEmail.mockResolvedValue(baseUser);
      mailService.sendPasswordResetEmail.mockRejectedValue(new Error('SMTP down'));
      await expect(
        service.forgotPassword({ email: 'alice@example.com' }),
      ).resolves.toBeUndefined();
    });
  });

  describe('resetPassword', () => {
    it('throws when token cannot be verified', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('bad token'));
      await expect(
        service.resetPassword({ token: 'invalid', newPassword: 'NewPass123!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws when user has no stored reset token hash', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      userService.findWithPasswordReset.mockResolvedValue({
        ...baseUser,
        passwordResetTokenHash: null,
        passwordResetExpires: null,
      });

      await expect(
        service.resetPassword({ token: 'valid-jwt', newPassword: 'NewPass123!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws when reset token has expired', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      userService.findWithPasswordReset.mockResolvedValue({
        ...baseUser,
        passwordResetTokenHash: 'hashed',
        passwordResetExpires: new Date(Date.now() - 1000),
      });

      await expect(
        service.resetPassword({ token: 'valid-jwt', newPassword: 'NewPass123!' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(userService.clearPasswordResetToken).toHaveBeenCalledWith('user-1');
    });

    it('throws when bcrypt comparison fails', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      userService.findWithPasswordReset.mockResolvedValue({
        ...baseUser,
        passwordResetTokenHash: 'hashed',
        passwordResetExpires: new Date(Date.now() + 60_000),
      });
      userService.validatePassword.mockResolvedValue(false);

      await expect(
        service.resetPassword({ token: 'tampered', newPassword: 'NewPass123!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('updates password and clears tokens on success', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      userService.findWithPasswordReset.mockResolvedValue({
        ...baseUser,
        passwordResetTokenHash: 'hashed',
        passwordResetExpires: new Date(Date.now() + 60_000),
      });
      userService.validatePassword.mockResolvedValue(true);
      userService.update.mockResolvedValue(baseUser);
      userService.clearPasswordResetToken.mockResolvedValue(undefined);
      userService.setRefreshToken.mockResolvedValue(undefined);

      await service.resetPassword({
        token: 'valid-jwt',
        newPassword: 'NewPass123!',
      });

      expect(userService.update).toHaveBeenCalledWith('user-1', {
        password: 'NewPass123!',
      });
      expect(userService.clearPasswordResetToken).toHaveBeenCalledWith('user-1');
      expect(userService.setRefreshToken).toHaveBeenCalledWith('user-1', null);
    });
  });
});
