import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AiProviderInterface,
  ChatMessage,
  ChatOptions,
  ChatResponse,
} from './ai-provider.interface';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable()
export class AnthropicProvider implements AiProviderInterface {
  private readonly logger = new Logger(AnthropicProvider.name);
  readonly name = 'anthropic';

  constructor(private readonly configService: ConfigService) {}

  async chat(
    messages: ChatMessage[],
    options?: ChatOptions,
  ): Promise<ChatResponse> {
    const apiKey = options?.apiKey || this.configService.get<string>('ANTHROPIC_API_KEY', '');
    const baseUrl = normalizeBaseUrl(
      options?.baseUrl || this.configService.get<string>('ANTHROPIC_BASE_URL', 'https://api.anthropic.com/v1'),
    );
    const model = options?.model || this.configService.get<string>('ANTHROPIC_MODEL', 'claude-3-5-sonnet-latest');

    if (!apiKey) {
      throw new ServiceUnavailableException('Anthropic API 未配置');
    }

    const { system, chatMessages } = splitSystemMessages(messages);

    try {
      const response = await fetch(`${baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          system,
          messages: chatMessages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 2000,
          stream: false,
        }),
        signal: AbortSignal.timeout(60_000),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`Anthropic API error: ${error}`);
        throw new Error(`Anthropic API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        content: Array.isArray(data.content)
          ? data.content
              .filter((item: { type?: string }) => item.type === 'text')
              .map((item: { text?: string }) => item.text || '')
              .join('')
          : '',
        model: data.model || model,
        usage: data.usage
          ? {
              promptTokens: data.usage.input_tokens || 0,
              completionTokens: data.usage.output_tokens || 0,
              totalTokens:
                (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0),
            }
          : undefined,
      };
    } catch (error) {
      this.logger.error(`Anthropic chat error: ${error.message}`);
      throw error;
    }
  }

  async *chatStream(
    messages: ChatMessage[],
    options?: ChatOptions,
  ): AsyncGenerator<string, void, unknown> {
    const apiKey = options?.apiKey || this.configService.get<string>('ANTHROPIC_API_KEY', '');
    const baseUrl = normalizeBaseUrl(
      options?.baseUrl || this.configService.get<string>('ANTHROPIC_BASE_URL', 'https://api.anthropic.com/v1'),
    );
    const model = options?.model || this.configService.get<string>('ANTHROPIC_MODEL', 'claude-3-5-sonnet-latest');

    if (!apiKey) {
      throw new ServiceUnavailableException('Anthropic API 未配置');
    }

    const { system, chatMessages } = splitSystemMessages(messages);

    try {
      const response = await fetch(`${baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          system,
          messages: chatMessages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 2000,
          stream: true,
        }),
        signal: AbortSignal.timeout(120_000),
      });

      if (!response.ok || !response.body) {
        const error = await response.text();
        this.logger.error(`Anthropic stream error: ${error}`);
        throw new Error(`Anthropic stream error: ${response.status}`);
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
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              yield parsed.delta.text;
            }
          } catch {
            // 跳过无法解析的 SSE 分片
          }
        }
      }
    } catch (error) {
      this.logger.error(`Anthropic stream error: ${error.message}`);
      throw error;
    }
  }
}

function splitSystemMessages(messages: ChatMessage[]): {
  system?: string;
  chatMessages: AnthropicMessage[];
} {
  const system = messages
    .filter((message) => message.role === 'system')
    .map((message) => message.content)
    .join('\n\n');
  const chatMessages = messages
    .filter((message) => message.role !== 'system')
    .map<AnthropicMessage>((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: message.content,
    }));

  return {
    system: system || undefined,
    chatMessages,
  };
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}
