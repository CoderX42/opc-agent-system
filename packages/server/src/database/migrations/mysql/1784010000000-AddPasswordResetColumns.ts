import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 为 users 表添加密码重置相关列：
 * - password_reset_token_hash：重置令牌的 bcrypt 哈希
 * - password_reset_expires：重置令牌过期时间
 *
 * 仅 MySQL 数据源加载（与 InitialMySqlSchema 同目录）。
 * 桌面端 SQLite 依赖 synchronize:true 自动建列。
 */
export class AddPasswordResetColumns1784010000000 implements MigrationInterface {
  name = 'AddPasswordResetColumns1784010000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD COLUMN IF NOT EXISTS \`password_reset_token_hash\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD COLUMN IF NOT EXISTS \`password_reset_expires\` datetime(6) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP COLUMN IF EXISTS \`password_reset_expires\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP COLUMN IF EXISTS \`password_reset_token_hash\``,
    );
  }
}
