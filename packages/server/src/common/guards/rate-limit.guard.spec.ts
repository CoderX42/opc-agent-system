import { ExecutionContext, HttpException } from '@nestjs/common';
import { AuthRateLimitGuard } from './rate-limit.guard';

describe('AuthRateLimitGuard', () => {
  function context(ip = '127.0.0.1', path = '/auth/login') {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ ip, path, socket: {} }),
      }),
    } as unknown as ExecutionContext;
  }

  it('allows requests inside the configured window', () => {
    const guard = new AuthRateLimitGuard();
    for (let index = 0; index < 10; index += 1) {
      expect(guard.canActivate(context())).toBe(true);
    }
  });

  it('rejects the eleventh request for the same identity and route', () => {
    const guard = new AuthRateLimitGuard();
    for (let index = 0; index < 10; index += 1) guard.canActivate(context());
    expect(() => guard.canActivate(context())).toThrow(HttpException);
  });

  it('keeps independent buckets per route and address', () => {
    const guard = new AuthRateLimitGuard();
    for (let index = 0; index < 10; index += 1) guard.canActivate(context());
    expect(guard.canActivate(context('127.0.0.2'))).toBe(true);
    expect(guard.canActivate(context('127.0.0.1', '/auth/register'))).toBe(true);
  });
});
