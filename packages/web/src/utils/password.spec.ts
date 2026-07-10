import { describe, it, expect } from 'vitest';
import {
  assessPassword,
  isPasswordAcceptable,
  type PasswordStrength,
} from './password';

/**
 * 前端密码强度评估工具的单元测试。
 * 保证与后端 DTO 的密码规则保持一致：至少 8 位且同时包含字母与数字。
 */
describe('password utils', () => {
  describe('isPasswordAcceptable', () => {
    it('returns true for passwords meeting the rule', () => {
      expect(isPasswordAcceptable('Password123!')).toBe(true);
      expect(isPasswordAcceptable('abcdef12')).toBe(true);
    });

    it('returns false for too short passwords', () => {
      expect(isPasswordAcceptable('Ab1')).toBe(false);
    });

    it('returns false when missing digits', () => {
      expect(isPasswordAcceptable('OnlyLettersHere')).toBe(false);
    });

    it('returns false when missing letters', () => {
      expect(isPasswordAcceptable('12345678')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isPasswordAcceptable('')).toBe(false);
    });
  });

  describe('assessPassword', () => {
    it('returns empty strength for blank password', () => {
      const result = assessPassword('');
      expect(result.strength).toBe('empty');
      expect(result.acceptable).toBe(false);
    });

    it('classifies a short letter-only password as weak', () => {
      const result = assessPassword('abc');
      expect(result.strength).toBe('weak');
      expect(result.acceptable).toBe(false);
    });

    it('classifies a medium password acceptably', () => {
      const result = assessPassword('Password123');
      expect(result.acceptable).toBe(true);
      expect(['medium', 'strong']).toContain(result.strength);
    });

    it('classifies a long varied password as strong', () => {
      const result = assessPassword('Str0ng!Passw0rd2026');
      expect(result.strength).toBe('strong');
      expect(result.acceptable).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(70);
    });

    it('score never exceeds 100', () => {
      const result = assessPassword('Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!');
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('strength progression is monotonic for added variety', () => {
      const weak = assessPassword('abcdefgh');
      const withDigit = assessPassword('abcdefgh1');
      const withUpper = assessPassword('Abcdefgh1');
      const withSymbol = assessPassword('Abcdefgh1!');
      expect(withDigit.score).toBeGreaterThanOrEqual(weak.score);
      expect(withUpper.score).toBeGreaterThanOrEqual(withDigit.score);
      expect(withSymbol.score).toBeGreaterThanOrEqual(withUpper.score);
    });
  });
});
