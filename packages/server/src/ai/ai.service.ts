import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProviderInterface, ChatMessage, ChatOptions, ChatResponse } from './providers/ai-provider.interface';
import { DeepseekProvider } from './providers/deepseek.provider';
import { OllamaProvider } from './providers/ollama.provider';
import { RagService } from './rag/rag.service';

export type AiProviderType = 'deepseek' | 'ollama';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly providers: Map<string, AiProviderInterface>;
  private readonly defaultProvider: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly deepseekProvider: DeepseekProvider,
    private readonly ollamaProvider: OllamaProvider,
    private readonly ragService: RagService,
  ) {
    this.providers = new Map<string, AiProviderInterface>();
    this.providers.set('deepseek', this.deepseekProvider);
    this.providers.set('ollama', this.ollamaProvider);
    this.defaultProvider = 'deepseek';
  }

  /**
   * 获取 AI Provider
   */
  getProvider(name?: AiProviderType): AiProviderInterface {
    const providerName = name || this.defaultProvider;
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`AI provider "${providerName}" not found`);
    }
    return provider;
  }

  /**
   * 获取所有可用的 Provider 列表
   */
  getAvailableProviders(): { name: string; isDefault: boolean }[] {
    return Array.from(this.providers.keys()).map((name) => ({
      name,
      isDefault: name === this.defaultProvider,
    }));
  }

  /**
   * 发送聊天消息
   */
  async chat(
    messages: ChatMessage[],
    options?: ChatOptions & { provider?: AiProviderType },
  ): Promise<ChatResponse> {
    const provider = this.getProvider(options?.provider);
    this.logger.log(`Sending chat to ${provider.name}`);
    return provider.chat(messages, options);
  }

  /**
   * 流式聊天
   */
  async *chatStream(
    messages: ChatMessage[],
    options?: ChatOptions & { provider?: AiProviderType },
  ): AsyncGenerator<string, void, unknown> {
    const provider = this.getProvider(options?.provider);
    this.logger.log(`Starting stream chat with ${provider.name}`);
    yield* provider.chatStream(messages, options);
  }

  /**
   * 带 RAG 的聊天
   */
  async chatWithRag(
    query: string,
    options?: ChatOptions & {
      provider?: AiProviderType;
      topK?: number;
      systemPrompt?: string;
    },
  ): Promise<ChatResponse> {
    // 1. 检索相关知识
    const { documents } = await this.ragService.retrieve(
      query,
      options?.topK || 5,
    );

    // 2. 构建带上下文的 Prompt
    const contextQuery = this.ragService.buildContextPrompt(query, documents);

    // 3. 构建消息
    const messages: ChatMessage[] = [];
    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: contextQuery });

    // 4. 调用 AI
    const response = await this.chat(messages, options);

    // 5. 附加引用信息
    if (documents.length > 0) {
      response.content += '\n\n---\n参考资料：\n';
      documents.forEach((doc, index) => {
        response.content += `${index + 1}. ${doc.title} (${doc.category})\n`;
      });
    }

    return response;
  }

  /**
   * 简单的聊天接口（用于快速调用）
   */
  async simpleChat(
    message: string,
    systemPrompt?: string,
    provider?: AiProviderType,
  ): Promise<string> {
    const messages: ChatMessage[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: message });

    const response = await this.chat(messages, { provider });
    return response.content;
  }
}
