export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
  stream?: boolean;
  apiKey?: string;
  baseUrl?: string;
  providerLabel?: string;
  apiKeyRequired?: boolean;
}

export interface ChatResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AiProviderInterface {
  readonly name: string;

  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;

  chatStream(
    messages: ChatMessage[],
    options?: ChatOptions,
  ): AsyncGenerator<string, void, unknown>;
}
