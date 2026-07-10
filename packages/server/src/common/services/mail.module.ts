import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';

/**
 * 全局邮件服务模块。
 * 目前不依赖任何第三方邮件库，便于在任意环境下开箱即用。
 */
@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
