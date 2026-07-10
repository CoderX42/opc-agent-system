import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from './register.dto';
import { ResetPasswordDto } from './reset-password.dto';
import { ChangePasswordDto } from './change-password.dto';
import { ForgotPasswordDto } from './forgot-password.dto';
import { LoginDto } from './login.dto';

/**
 * 认证相关 DTO 校验测试。
 * 重点覆盖密码强度规则与邮箱格式，确保前后端契约一致。
 */
describe('Auth DTOs', () => {
  async function validateDto<T extends object>(
    cls: new () => T,
    payload: Record<string, unknown>,
  ): Promise<string[]> {
    const instance = plainToInstance(cls, payload);
    const errors = await validate(instance as object);
    return errors.flatMap((e) => Object.values(e.constraints ?? {}));
  }

  describe('RegisterDto', () => {
    it('accepts a valid payload', async () => {
      const errors = await validateDto(RegisterDto, {
        username: 'alice',
        email: 'alice@example.com',
        password: 'Password123!',
      });
      expect(errors).toHaveLength(0);
    });

    it('rejects passwords shorter than 8 characters', async () => {
      const errors = await validateDto(RegisterDto, {
        username: 'alice',
        email: 'alice@example.com',
        password: 'Ab1',
      });
      expect(errors.some((m) => m.includes('8 位'))).toBe(true);
    });

    it('rejects passwords without digits', async () => {
      const errors = await validateDto(RegisterDto, {
        username: 'alice',
        email: 'alice@example.com',
        password: 'PasswordOnly',
      });
      expect(errors.some((m) => m.includes('字母与数字'))).toBe(true);
    });

    it('rejects passwords without letters', async () => {
      const errors = await validateDto(RegisterDto, {
        username: 'alice',
        email: 'alice@example.com',
        password: '12345678',
      });
      expect(errors.some((m) => m.includes('字母与数字'))).toBe(true);
    });

    it('rejects invalid email', async () => {
      const errors = await validateDto(RegisterDto, {
        username: 'alice',
        email: 'not-an-email',
        password: 'Password123!',
      });
      expect(errors.some((m) => m.includes('email'))).toBe(true);
    });
  });

  describe('ResetPasswordDto', () => {
    it('accepts a valid token and strong password', async () => {
      const errors = await validateDto(ResetPasswordDto, {
        token: 'some-jwt',
        newPassword: 'NewPass123!',
      });
      expect(errors).toHaveLength(0);
    });

    it('rejects empty token', async () => {
      const errors = await validateDto(ResetPasswordDto, {
        token: '',
        newPassword: 'NewPass123!',
      });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects weak new password', async () => {
      const errors = await validateDto(ResetPasswordDto, {
        token: 'some-jwt',
        newPassword: 'weak',
      });
      expect(errors.some((m) => m.includes('8 位'))).toBe(true);
    });
  });

  describe('ChangePasswordDto', () => {
    it('accepts valid old and new passwords', async () => {
      const errors = await validateDto(ChangePasswordDto, {
        oldPassword: 'OldPass123!',
        newPassword: 'NewPass123!',
      });
      expect(errors).toHaveLength(0);
    });

    it('rejects new password without digit', async () => {
      const errors = await validateDto(ChangePasswordDto, {
        oldPassword: 'OldPass123!',
        newPassword: 'OnlyLetters',
      });
      expect(errors.some((m) => m.includes('字母与数字'))).toBe(true);
    });
  });

  describe('ForgotPasswordDto', () => {
    it('accepts a valid email', async () => {
      const errors = await validateDto(ForgotPasswordDto, {
        email: 'alice@example.com',
      });
      expect(errors).toHaveLength(0);
    });

    it('rejects invalid email', async () => {
      const errors = await validateDto(ForgotPasswordDto, {
        email: 'nope',
      });
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('LoginDto', () => {
    it('accepts username, password and optional rememberMe', async () => {
      const errors = await validateDto(LoginDto, {
        username: 'alice',
        password: 'Password123!',
        rememberMe: true,
      });
      expect(errors).toHaveLength(0);
    });

    it('works without rememberMe (optional)', async () => {
      const errors = await validateDto(LoginDto, {
        username: 'alice',
        password: 'Password123!',
      });
      expect(errors).toHaveLength(0);
    });
  });
});
