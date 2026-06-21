import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AiProviderInterface,
  ChatMessage,
  ChatOptions,
  ChatResponse,
} from './ai-provider.interface';

@Injectable()
export class OllamaProvider implements AiProviderInterface {
  private readonly logger = new Logger(OllamaProvider.name);
  readonly name = 'ollama';
  private readonly baseUrl: string;
  private readonly defaultModel: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>(
      'OLLAMA_BASE_URL',
      'http://localhost:11434',
    );
    this.defaultModel = this.configService.get<string>(
      'OLLAMA_MODEL',
      'llama3',
    );
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    try {
      const model = options?.model || this.defaultModel;

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          stream: false,
          options: {
            temperature: options?.temperature ?? 0.7,
            num_predict: options?.maxTokens ?? 2000,
          },
        }),
        signal: AbortSignal.timeout(60_000),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`Ollama API error: ${error}`);
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        content: data.message?.content || '',
        model: data.model || model,
        usage: data.eval_count
          ? {
              promptTokens: data.prompt_eval_count || 0,
              completionTokens: data.eval_count,
              totalTokens: (data.prompt_eval_count || 0) + data.eval_count,
            }
          : undefined,
      };
    } catch (error) {
      this.logger.error(`Ollama chat error: ${error.message}`);
      throw error;
    }
  }

  async *chatStream(
    messages: ChatMessage[],
    options?: ChatOptions,
  ): AsyncGenerator<string, void, unknown> {
    try {
      const model = options?.model || this.defaultModel;

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          options: {
            temperature: options?.temperature ?? 0.7,
            num_predict: options?.maxTokens ?? 2000,
          },
        }),
        signal: AbortSignal.timeout(120_000),
      });

      if (!response.ok || !response.body) {
        const error = await response.text();
        this.logger.error(`Ollama stream error: ${error}`);
        throw new Error(`Ollama stream error: ${response.status}`);
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
          if (!trimmed) continue;

          try {
            const parsed = JSON.parse(trimmed);
            const content = parsed.message?.content;
            if (content) {
              yield content;
            }
            if (parsed.done) return;
          } catch {
            // 跳过无法解析的行
          }
        }
      }
    } catch (error) {
      this.logger.error(`Ollama stream error: ${error.message}`);
      throw error;
    }
  }
}
