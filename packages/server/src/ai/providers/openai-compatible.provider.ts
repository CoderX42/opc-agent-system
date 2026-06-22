import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AiProviderInterface,
  ChatMessage,
  ChatOptions,
  ChatResponse,
} from './ai-provider.interface';

@Injectable()
export class OpenAiCompatibleProvider implements AiProviderInterface {
  private readonly logger = new Logger(OpenAiCompatibleProvider.name);
  readonly name = 'openai-compatible';

  constructor(private readonly configService: ConfigService) {}

  async chat(
    messages: ChatMessage[],
    options?: ChatOptions,
  ): Promise<ChatResponse> {
    const apiKey = options?.apiKey || this.configService.get<string>('OPENAI_API_KEY', '');
    const baseUrl = normalizeBaseUrl(
      options?.baseUrl || this.configService.get<string>('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
    );
    const model = options?.model || this.configService.get<string>('OPENAI_MODEL', 'gpt-4o-mini');

    if (options?.apiKeyRequired !== false && !apiKey) {
      throw new ServiceUnavailableException(`${options?.providerLabel || 'OpenAI compatible'} API 未配置`);
    }
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 2000,
          stream: false,
        }),
        signal: AbortSignal.timeout(60_000),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`${options?.providerLabel || this.name} API error: ${error}`);
        throw new Error(`${options?.providerLabel || this.name} API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        content: data.choices?.[0]?.message?.content || '',
        model: data.model || model,
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens || 0,
              completionTokens: data.usage.completion_tokens || 0,
              totalTokens: data.usage.total_tokens || 0,
            }
          : undefined,
      };
    } catch (error) {
      this.logger.error(`${options?.providerLabel || this.name} chat error: ${error.message}`);
      throw error;
    }
  }

  async *chatStream(
    messages: ChatMessage[],
    options?: ChatOptions,
  ): AsyncGenerator<string, void, unknown> {
    const apiKey = options?.apiKey || this.configService.get<string>('OPENAI_API_KEY', '');
    const baseUrl = normalizeBaseUrl(
      options?.baseUrl || this.configService.get<string>('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
    );
    const model = options?.model || this.configService.get<string>('OPENAI_MODEL', 'gpt-4o-mini');

    if (options?.apiKeyRequired !== false && !apiKey) {
      throw new ServiceUnavailableException(`${options?.providerLabel || 'OpenAI compatible'} API 未配置`);
    }
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 2000,
          stream: true,
        }),
        signal: AbortSignal.timeout(120_000),
      });

      if (!response.ok || !response.body) {
        const error = await response.text();
        this.logger.error(`${options?.providerLabel || this.name} stream error: ${error}`);
        throw new Error(`${options?.providerLabel || this.name} stream error: ${response.status}`);
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
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch {
            // 跳过无法解析的 SSE 分片
          }
        }
      }
    } catch (error) {
      this.logger.error(`${options?.providerLabel || this.name} stream error: ${error.message}`);
      throw error;
    }
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}
