import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiHideProperty } from '@nestjs/swagger';

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BANNED = 'BANNED',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  username: string;

  @ApiHideProperty()
  @Column({ type: 'varchar', length: 255, select: false })
  password: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  email: string;

  @Column({ type: 'simple-enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatar: string;

  @Column({ type: 'simple-enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @ApiHideProperty()
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'refresh_token_hash',
    select: false,
  })
  refreshTokenHash: string | null;

  /** 密码重置令牌的 bcrypt 哈希，仅在校验时被显式 select */
  @ApiHideProperty()
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'password_reset_token_hash',
    select: false,
  })
  passwordResetTokenHash: string | null;

  /** 密码重置令牌的过期时间（UTC） */
  @ApiHideProperty()
  @Column({
    type: 'datetime',
    nullable: true,
    name: 'password_reset_expires',
    select: false,
  })
  passwordResetExpires: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
