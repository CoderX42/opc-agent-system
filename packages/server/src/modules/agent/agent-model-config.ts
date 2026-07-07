import { AgentType } from './entities/agent.entity';
import { AiProviderType } from '../../ai/ai.service';

export type AgentModelProvider =
  | 'deepseek'
  | 'openai'
  | 'anthropic'
  | 'minimax'
  | 'moonshot'
  | 'kimi-code'
  | 'qwen'
  | 'zhipu'
  | 'doubao'
  | 'hunyuan'
  | 'wenxin'
  | 'baichuan'
  | 'gemini'
  | 'siliconflow'
  | 'ollama'
  | 'local-openai'
  | 'custom-openai';

export interface AgentModelConfig {
  provider: AgentModelProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
  enableMemory: boolean;
  enableTools: boolean;
  apiKeyRequired?: boolean;
}

export interface AgentProviderPreset {
  value: AgentModelProvider;
  label: string;
  region: 'domestic' | 'international' | 'local' | 'custom';
  protocol: 'openai-compatible' | 'anthropic' | 'ollama';
  defaultBaseUrl: string;
  defaultModel: string;
  apiKeyRequired: boolean;
  models: Array<{ label: string; value: string }>;
  description: string;
}

export const AGENT_PROVIDER_PRESETS: AgentProviderPreset[] = [
  {
    value: 'deepseek',
    label: 'DeepSeek',
    region: 'domestic',
    protocol: 'openai-compatible',
    defaultBaseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-v4-flash',
    apiKeyRequired: true,
    models: [
      { label: 'DeepSeek V4 Flash', value: 'deepseek-v4-flash' },
      { label: 'DeepSeek V4 Pro', value: 'deepseek-v4-pro' },
      { label: 'DeepSeek Chat (Legacy)', value: 'deepseek-chat' },
      { label: 'DeepSeek Reasoner (Legacy)', value: 'deepseek-reasoner' },
    ],
    description: '国产通用推理与代码能力，兼容 OpenAI Chat Completions。',
  },
  {
    value: 'moonshot',
    label: 'Kimi / Moonshot',
    region: 'domestic',
    protocol: 'openai-compatible',
    defaultBaseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'kimi-k2.6',
    apiKeyRequired: true,
    models: [
      { label: 'Kimi K2.6', value: 'kimi-k2.6' },
      { label: 'Kimi K2.7 Code', value: 'kimi-k2.7-code' },
      { label: 'Moonshot v1 8K', value: 'moonshot-v1-8k' },
      { label: 'Moonshot v1 32K', value: 'moonshot-v1-32k' },
    ],
    description: 'Kimi 常规对话模型，适合法务、长文档与知识问答。',
  },
  {
    value: 'kimi-code',
    label: 'Kimi Code',
    region: 'domestic',
    protocol: 'openai-compatible',
    defaultBaseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'kimi-k2.7-code',
    apiKeyRequired: true,
    models: [
      { label: 'Kimi K2.7 Code', value: 'kimi-k2.7-code' },
      { label: 'Kimi K2.6', value: 'kimi-k2.6' },
      { label: '自定义 Kimi Code 模型', value: 'kimi-code-custom' },
    ],
    description: '面向代码与 Agent 编排场景，可按官方模型名覆盖。',
  },
  {
    value: 'minimax',
    label: 'MiniMax',
    region: 'domestic',
    protocol: 'openai-compatible',
    defaultBaseUrl: 'https://api.minimax.io/v1',
    defaultModel: 'MiniMax-M3',
    apiKeyRequired: true,
    models: [
      { label: 'MiniMax M3', value: 'MiniMax-M3' },
      { label: 'MiniMax M2.7', value: 'MiniMax-M2.7' },
      { label: 'MiniMax M2.5', value: 'MiniMax-M2.5' },
      { label: 'MiniMax M2.1', value: 'MiniMax-M2.1' },
    ],
    description: '国产多模态与长上下文服务，支持 OpenAI 兼容接入。',
  },
  {
    value: 'qwen',
    label: '通义千问 / DashScope',
    region: 'domestic',
    protocol: 'openai-compatible',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-plus',
    apiKeyRequired: true,
    models: [
      { label: 'Qwen Plus', value: 'qwen-plus' },
      { label: 'Qwen Max', value: 'qwen-max' },
      { label: 'Qwen Turbo', value: 'qwen-turbo' },
    ],
    description: '阿里云百炼 / DashScope OpenAI 兼容模式。',
  },
  {
    value: 'zhipu',
    label: '智谱 GLM',
    region: 'domestic',
    protocol: 'openai-compatible',
    defaultBaseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4-plus',
    apiKeyRequired: true,
    models: [
      { label: 'GLM-4 Plus', value: 'glm-4-plus' },
      { label: 'GLM-4 Air', value: 'glm-4-air' },
      { label: 'GLM-4 Flash', value: 'glm-4-flash' },
    ],
    description: '智谱 AI GLM 系列，适合通用办公与知识处理。',
  },
  {
    value: 'doubao',
    label: '豆包 / 火山方舟',
    region: 'domestic',
    protocol: 'openai-compatible',
    defaultBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    defaultModel: 'doubao-seed-1-6',
    apiKeyRequired: true,
    models: [
      { label: 'Doubao Seed 1.6', value: 'doubao-seed-1-6' },
      { label: 'Doubao Seed 1.6 Thinking', value: 'doubao-seed-1-6-thinking' },
      { label: 'Doubao Pro 32K', value: 'doubao-pro-32k' },
    ],
    description: '火山方舟 OpenAI 兼容接入，适合办公助手与企业知识问答。',
  },
  {
    value: 'hunyuan',
    label: '腾讯混元',
    region: 'domestic',
    protocol: 'openai-compatible',
    defaultBaseUrl: 'https://api.hunyuan.cloud.tencent.com/v1',
    defaultModel: 'hunyuan-turbos-latest',
    apiKeyRequired: true,
    models: [
      { label: 'Hunyuan Turbos Latest', value: 'hunyuan-turbos-latest' },
      { label: 'Hunyuan Turbo Latest', value: 'hunyuan-turbo-latest' },
      { label: 'Hunyuan Lite', value: 'hunyuan-lite' },
    ],
    description: '腾讯混元 OpenAI 兼容 API，适合企业办公与客服场景。',
  },
  {
    value: 'wenxin',
    label: '百度文心 / 千帆',
    region: 'domestic',
    protocol: 'openai-compatible',
    defaultBaseUrl: 'https://qianfan.baidubce.com/v2',
    defaultModel: 'ernie-4.0-turbo-8k',
    apiKeyRequired: true,
    models: [
      { label: 'ERNIE 4.0 Turbo 8K', value: 'ernie-4.0-turbo-8k' },
      { label: 'ERNIE 4.5 Turbo 32K', value: 'ernie-4.5-turbo-32k' },
      { label: 'ERNIE Speed 8K', value: 'ernie-speed-8k' },
    ],
    description: '百度智能云千帆 OpenAI 兼容模式，适合中文办公处理。',
  },
  {
    value: 'baichuan',
    label: '百川智能',
    region: 'domestic',
    protocol: 'openai-compatible',
    defaultBaseUrl: 'https://api.baichuan-ai.com/v1',
    defaultModel: 'Baichuan4-Turbo',
    apiKeyRequired: true,
    models: [
      { label: 'Baichuan4 Turbo', value: 'Baichuan4-Turbo' },
      { label: 'Baichuan3 Turbo', value: 'Baichuan3-Turbo' },
      { label: 'Baichuan2 Turbo', value: 'Baichuan2-Turbo' },
    ],
    description: '百川智能 OpenAI 兼容接入，适合通用问答与文本处理。',
  },
  {
    value: 'siliconflow',
    label: '硅基流动',
    region: 'domestic',
    protocol: 'openai-compatible',
    defaultBaseUrl: 'https://api.siliconflow.cn/v1',
    defaultModel: 'Qwen/Qwen2.5-72B-Instruct',
    apiKeyRequired: true,
    models: [
      { label: 'Qwen2.5 72B Instruct', value: 'Qwen/Qwen2.5-72B-Instruct' },
      { label: 'DeepSeek V3', value: 'deepseek-ai/DeepSeek-V3' },
      { label: 'DeepSeek R1', value: 'deepseek-ai/DeepSeek-R1' },
    ],
    description: '聚合国产与开源大模型，OpenAI 兼容 API。',
  },
  {
    value: 'openai',
    label: 'OpenAI',
    region: 'international',
    protocol: 'openai-compatible',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    apiKeyRequired: true,
    models: [
      { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
      { label: 'GPT-4o', value: 'gpt-4o' },
      { label: 'GPT-4.1 Mini', value: 'gpt-4.1-mini' },
      { label: 'GPT-4.1', value: 'gpt-4.1' },
    ],
    description: 'OpenAI 官方 Chat Completions 兼容接入。',
  },
  {
    value: 'anthropic',
    label: 'Claude / Anthropic',
    region: 'international',
    protocol: 'anthropic',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-sonnet-latest',
    apiKeyRequired: true,
    models: [
      { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-latest' },
      { label: 'Claude 3.5 Haiku', value: 'claude-3-5-haiku-latest' },
      { label: 'Claude 3 Opus', value: 'claude-3-opus-latest' },
    ],
    description: 'Anthropic Messages API，适合写作、法务审阅和长对话。',
  },
  {
    value: 'gemini',
    label: 'Google Gemini',
    region: 'international',
    protocol: 'openai-compatible',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-2.0-flash',
    apiKeyRequired: true,
    models: [
      { label: 'Gemini 2.0 Flash', value: 'gemini-2.0-flash' },
      { label: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
      { label: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash' },
    ],
    description: 'Google Gemini OpenAI 兼容接口，适合多语言办公与长上下文任务。',
  },
  {
    value: 'ollama',
    label: 'Ollama 本地模型',
    region: 'local',
    protocol: 'ollama',
    defaultBaseUrl: 'http://localhost:11434',
    defaultModel: 'llama3',
    apiKeyRequired: false,
    models: [
      { label: 'Llama 3', value: 'llama3' },
      { label: 'Qwen2.5', value: 'qwen2.5' },
      { label: 'DeepSeek R1', value: 'deepseek-r1' },
      { label: 'Mistral', value: 'mistral' },
    ],
    description: '直接连接本机或局域网 Ollama 服务。',
  },
  {
    value: 'local-openai',
    label: '本地 OpenAI 兼容',
    region: 'local',
    protocol: 'openai-compatible',
    defaultBaseUrl: 'http://localhost:1234/v1',
    defaultModel: 'local-model',
    apiKeyRequired: false,
    models: [
      { label: 'LM Studio 默认模型', value: 'local-model' },
      { label: 'vLLM / LocalAI 自定义', value: 'custom-local-model' },
    ],
    description: '适配 LM Studio、vLLM、LocalAI 等本地 OpenAI 兼容服务。',
  },
  {
    value: 'custom-openai',
    label: '自定义 OpenAI 兼容',
    region: 'custom',
    protocol: 'openai-compatible',
    defaultBaseUrl: '',
    defaultModel: '',
    apiKeyRequired: false,
    models: [],
    description: '用于代理网关、企业私有模型平台或其他兼容服务。',
  },
];

const DEFAULT_SYSTEM_PROMPTS: Record<AgentType, string> = {
  [AgentType.FINANCE]:
    '你是严谨的财务助理，提供记账、发票和经营分析建议，不虚构数字。',
  [AgentType.CUSTOMER_SERVICE]:
    '你是专业客服助理，回答清晰、友善，并在不确定时转人工。',
  [AgentType.LEGAL]:
    '你是法务辅助工具，识别风险并明确提示内容不构成正式法律意见。',
  [AgentType.ADMIN]:
    '你是行政助理，帮助拆解任务、日程和会议行动项。',
};

export function getProviderPreset(provider?: string): AgentProviderPreset {
  return (
    AGENT_PROVIDER_PRESETS.find((preset) => preset.value === provider) ||
    AGENT_PROVIDER_PRESETS[0]
  );
}

export function defaultAgentConfig(type: AgentType): AgentModelConfig {
  const preset = getProviderPreset('deepseek');
  return {
    provider: preset.value,
    model: preset.defaultModel,
    baseUrl: preset.defaultBaseUrl,
    temperature: 0.7,
    maxTokens: 2000,
    systemPrompt: DEFAULT_SYSTEM_PROMPTS[type],
    enableMemory: true,
    enableTools: true,
    apiKeyRequired: preset.apiKeyRequired,
  };
}

export function normalizeAgentConfig(
  type: AgentType,
  config?: Record<string, unknown> | null,
): AgentModelConfig {
  const base = defaultAgentConfig(type);
  if (!config) return base;

  const provider = typeof config.provider === 'string' ? config.provider : base.provider;
  const preset = getProviderPreset(provider);

  return {
    provider: preset.value,
    model: readString(config.model) || preset.defaultModel || base.model,
    apiKey: readString(config.apiKey),
    baseUrl: readString(config.baseUrl) || preset.defaultBaseUrl,
    temperature: readNumber(config.temperature, base.temperature),
    maxTokens: readNumber(config.maxTokens, base.maxTokens),
    systemPrompt: readString(config.systemPrompt) || base.systemPrompt,
    enableMemory: readBoolean(config.enableMemory, base.enableMemory),
    enableTools: readBoolean(config.enableTools, base.enableTools),
    apiKeyRequired: readBoolean(config.apiKeyRequired, preset.apiKeyRequired),
  };
}

export function mergeAgentConfig(
  type: AgentType,
  currentConfig: Record<string, unknown> | null | undefined,
  nextConfig: Partial<AgentModelConfig>,
): AgentModelConfig {
  const current = normalizeAgentConfig(type, currentConfig);
  const provider = nextConfig.provider || current.provider;
  const preset = getProviderPreset(provider);

  // API Key 隔离：切换服务商时强制清空，避免密钥跨 provider 串用。
  // 仅当用户在新 patch 里显式提供非 masked 的 key 时才使用。
  const providerChanged =
    typeof nextConfig.provider === 'string' && nextConfig.provider !== current.provider;
  const rawKey = nextConfig.apiKey;
  const isMasked = typeof rawKey === 'string' && rawKey.includes('*');
  const isExplicit =
    typeof rawKey === 'string' && rawKey.length > 0 && !isMasked;

  let apiKey: string | undefined;
  if (providerChanged) {
    apiKey = isExplicit ? rawKey : undefined;
  } else if (rawKey === undefined || isMasked) {
    apiKey = current.apiKey;
  } else {
    apiKey = isExplicit ? rawKey : undefined;
  }

  return {
    ...current,
    provider: preset.value,
    model: nextConfig.model ?? current.model ?? preset.defaultModel,
    apiKey,
    baseUrl: nextConfig.baseUrl ?? current.baseUrl ?? preset.defaultBaseUrl,
    temperature: nextConfig.temperature ?? current.temperature,
    maxTokens: nextConfig.maxTokens ?? current.maxTokens,
    systemPrompt: nextConfig.systemPrompt ?? current.systemPrompt,
    enableMemory: nextConfig.enableMemory ?? current.enableMemory,
    enableTools: nextConfig.enableTools ?? current.enableTools,
    apiKeyRequired: nextConfig.apiKeyRequired ?? preset.apiKeyRequired,
  };
}

export function sanitizeAgentConfig(config: AgentModelConfig): AgentModelConfig {
  return {
    ...config,
    apiKey: maskApiKey(config.apiKey),
  };
}

export function maskApiKey(apiKey?: string): string | undefined {
  if (!apiKey) return undefined;
  if (apiKey.length <= 8) return '********';
  return `${apiKey.slice(0, 4)}****${apiKey.slice(-4)}`;
}

export function toAiProviderType(config: AgentModelConfig): AiProviderType {
  const preset = getProviderPreset(config.provider);
  if (preset.protocol === 'anthropic') return 'anthropic';
  if (preset.protocol === 'ollama') return 'ollama';
  if (config.provider === 'deepseek') return 'deepseek';
  if (preset.protocol === 'openai-compatible') return 'openai-compatible';
  return 'openai-compatible';
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}
