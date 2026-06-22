import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AiProviderInterface,
  ChatMessage,
  ChatOptions,
  ChatResponse,
} from './ai-provider.interface';

@Injectable()
export class DeepseekProvider implements AiProviderInterface {
  private readonly logger = new Logger(DeepseekProvider.name);
  readonly name = 'deepseek';
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('DEEPSEEK_API_KEY', '');
    this.baseUrl = this.configService.get<string>(
      'DEEPSEEK_BASE_URL',
      'https://api.deepseek.com/v1',
    );
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    try {
      const apiKey = options?.apiKey || this.apiKey;
      const baseUrl = normalizeBaseUrl(options?.baseUrl || this.baseUrl);

      if (!apiKey) {
        throw new ServiceUnavailableException('DeepSeek API 未配置');
      }
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: options?.model || 'deepseek-chat',
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 2000,
          stream: false,
        }),
        signal: AbortSignal.timeout(30_000),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`DeepSeek API error: ${error}`);
        throw new Error(`DeepSeek API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        content: data.choices[0]?.message?.content || '',
        model: data.model || 'deepseek-chat',
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined,
      };
    } catch (error) {
      this.logger.error(`DeepSeek chat error: ${error.message}`);
      throw error;
    }
  }

  async *chatStream(
    messages: ChatMessage[],
    options?: ChatOptions,
  ): AsyncGenerator<string, void, unknown> {
    try {
      const apiKey = options?.apiKey || this.apiKey;
      const baseUrl = normalizeBaseUrl(options?.baseUrl || this.baseUrl);

      if (!apiKey) {
        throw new ServiceUnavailableException('DeepSeek API 未配置');
      }
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: options?.model || 'deepseek-chat',
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 2000,
          stream: true,
        }),
        signal: AbortSignal.timeout(60_000),
      });

      if (!response.ok || !response.body) {
        const error = await response.text();
        this.logger.error(`DeepSeek stream error: ${error}`);
        throw new Error(`DeepSeek stream error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') return;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch {
            // 跳过无法解析的行
          }
        }
      }
    } catch (error) {
      this.logger.error(`DeepSeek stream error: ${error.message}`);
      throw error;
    }
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}
