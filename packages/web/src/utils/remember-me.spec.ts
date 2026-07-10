import { describe, it, expect, beforeEach } from 'vitest';
import {
  getRememberMe,
  setRememberMe,
  removeRememberMe,
  getToken,
  setToken,
  removeToken,
  getRefreshToken,
  setRefreshToken,
} from './index';

/**
 * Token 与"保持登录"持久化工具的单元测试。
 * 使用真实 localStorage（jsdom 环境提供）。
 */
describe('token & remember-me storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('remember me', () => {
    it('defaults to false when not set', () => {
      expect(getRememberMe()).toBe(false);
    });

    it('persists true value', () => {
      setRememberMe(true);
      expect(getRememberMe()).toBe(true);
    });

    it('persists false value', () => {
      setRememberMe(true);
      setRememberMe(false);
      expect(getRememberMe()).toBe(false);
    });

    it('can be cleared', () => {
      setRememberMe(true);
      removeRememberMe();
      expect(getRememberMe()).toBe(false);
    });
  });

  describe('access token', () => {
    it('stores and retrieves token', () => {
      expect(getToken()).toBeNull();
      setToken('abc');
      expect(getToken()).toBe('abc');
    });

    it('removeToken clears both token and refreshToken', () => {
      setToken('abc');
      setRefreshToken('def');
      removeToken();
      expect(getToken()).toBeNull();
      expect(getRefreshToken()).toBeNull();
    });
  });

  describe('refresh token', () => {
    it('stores and retrieves refresh token', () => {
      expect(getRefreshToken()).toBeNull();
      setRefreshToken('rft');
      expect(getRefreshToken()).toBe('rft');
    });
  });
});
