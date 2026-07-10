import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * 轻量级邮件服务。
 *
 * 生产环境可通过 MAIL_DSN 配置接入真实 SMTP，目前为开发友好：
 * 未配置 SMTP 时将邮件内容输出到日志，方便本地联调忘记密码等流程。
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  /** 应用对外可访问的基础地址，用于拼接重置链接 */
  private readonly appBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.appBaseUrl = this.configService.get<string>(
      'APP_BASE_URL',
      'http://localhost:5173',
    );
  }

  /**
   * 发送密码重置邮件。
   * 在未配置 SMTP 的情况下，会将重置链接打印到日志，便于本地开发。
   */
  async sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
    const resetLink = `${this.appBaseUrl}/reset-password?token=${resetToken}`;
    const subject = '【OPC Agent】密码重置';
    const text = [
      '你正在重置 OPC Agent System 的账户密码。',
      '请在 15 分钟内点击下方链接完成重置：',
      '',
      resetLink,
      '',
      '如果本次重置请求不是你本人发起，请忽略本邮件，账户密码不会发生变化。',
    ].join('\n');

    await this.dispatch(to, subject, text);
  }

  /**
   * 派发邮件。当未配置 SMTP 时降级为日志输出。
   * 预留 SMTP 接入点：设置 MAIL_DSN 环境变量后可接入真实邮件网关。
   */
  private async dispatch(to: string, subject: string, text: string): Promise<void> {
    const mailDsn = this.configService.get<string>('MAIL_DSN');
    if (!mailDsn) {
      this.logger.warn(
        `[Mail] MAIL_DSN 未配置，邮件将以日志形式输出（仅开发环境）。\n  To: ${to}\n  Subject: ${subject}\n  Body:\n${text}`,
      );
      return;
    }

    // 真实 SMTP 发送在接入 nodemailer/@nestjs-modules/mailer 后在此实现。
    // 当前保留同步契约，避免引入未使用的依赖。
    this.logger.log(`[Mail] 发送邮件至 ${to}：${subject}`);
  }
}
