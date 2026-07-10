import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });
    return this.userRepository.save(user);
  }

  async findAll(page = 1, limit = 10): Promise<{ items: User[]; total: number }> {
    const [items, total] = await this.userRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
      select: ['id', 'username', 'email', 'role', 'avatar', 'status', 'createdAt', 'updatedAt'],
    });
    return { items, total };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      select: ['id', 'username', 'email', 'role', 'avatar', 'status', 'createdAt', 'updatedAt'],
    });
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }
    return user;
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.username = :username', { username })
      .getOne();
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  async findByIdWithPassword(id: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id })
      .getOne();
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }
    await this.userRepository.remove(user);
  }

  async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async findWithRefreshToken(id: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.refreshTokenHash')
      .where('user.id = :id', { id })
      .getOne();
  }

  async setRefreshToken(id: string, token: string | null): Promise<void> {
    const refreshTokenHash = token ? await bcrypt.hash(token, 10) : null;
    await this.userRepository.update(id, { refreshTokenHash });
  }

  /** 查询用户并显式带出密码重置字段 */
  async findWithPasswordReset(id: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordResetTokenHash')
      .addSelect('user.passwordResetExpires')
      .where('user.id = :id', { id })
      .getOne();
  }

  /** 按邮箱查询用户（用于忘记密码流程定位账户） */
  async findActiveByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      select: ['id', 'username', 'email', 'status'],
    });
  }

  /** 设置密码重置令牌（哈希存储）与过期时间 */
  async setPasswordResetToken(
    id: string,
    token: string | null,
    expiresAt: Date | null,
  ): Promise<void> {
    const passwordResetTokenHash = token ? await bcrypt.hash(token, 10) : null;
    await this.userRepository.update(id, {
      passwordResetTokenHash,
      passwordResetExpires: expiresAt,
    });
  }

  /** 清除密码重置令牌，通常在重置成功后调用 */
  async clearPasswordResetToken(id: string): Promise<void> {
    await this.userRepository.update(id, {
      passwordResetTokenHash: null,
      passwordResetExpires: null,
    });
  }
}
