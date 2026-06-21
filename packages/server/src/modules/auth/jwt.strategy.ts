import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string; username: string; role: string }) {
    const cacheKey = `auth:user:${payload.sub}`;
    let user = await this.cache.get<{
      id: string;
      username: string;
      email: string;
      role: string;
      status: string;
    }>(cacheKey);
    if (!user) {
      user = await this.userService.findOne(payload.sub);
      await this.cache.set(cacheKey, user, 30_000);
    }
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('账号已被禁用');
    }
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };
  }
}
