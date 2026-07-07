/**
 * 各 LLM 服务商常见的 Base URL 候选。
 * 选择时优先使用预设 defaultBaseUrl；这里列出的是同一服务商在不同
 * 区域/协议/反代的常见可用地址，方便用户快速切换。
 */
export const COMMON_BASE_URLS: Record<string, string[]> = {
  deepseek: ['https://api.deepseek.com', 'https://api.deepseek.com/v1'],
  openai: ['https://api.openai.com/v1', 'https://api.openai.com'],
  anthropic: ['https://api.anthropic.com/v1', 'https://api.anthropic.com'],
  moonshot: ['https://api.moonshot.cn/v1', 'https://api.moonshot.cn/anthropic'],
  'kimi-code': ['https://api.moonshot.cn/v1', 'https://api.moonshot.cn/anthropic'],
  minimax: ['https://api.minimax.io/v1', 'https://api.minimax.chat/v1'],
  qwen: [
    'https://dashscope.aliyuncs.com/compatible-mode/v1',
    'https://dashscope.aliyuncs.com/api/v1',
  ],
  zhipu: ['https://open.bigmodel.cn/api/paas/v4', 'https://open.bigmodel.cn/api/paas/v3'],
  doubao: ['https://ark.cn-beijing.volces.com/api/v3'],
  hunyuan: ['https://api.hunyuan.cloud.tencent.com/v1', 'https://hunyuan.tencent.com/v1'],
  wenxin: ['https://qianfan.baidubce.com/v2', 'https://aip.baidubce.com'],
  baichuan: ['https://api.baichuan-ai.com/v1'],
  gemini: [
    'https://generativelanguage.googleapis.com/v1beta/openai',
    'https://generativelanguage.googleapis.com/v1beta',
  ],
  siliconflow: ['https://api.siliconflow.cn/v1'],
  ollama: ['http://localhost:11434', 'http://127.0.0.1:11434'],
  'local-openai': [
    'http://localhost:1234/v1',
    'http://localhost:8080/v1',
    'http://127.0.0.1:1234/v1',
  ],
};

/**
 * 返回某个 provider 的常见 URL 候选：预设默认 + 速选表 + 当前值（去重保序）。
 */
export function suggestBaseUrls(
  provider: string | undefined,
  defaultBaseUrl: string | undefined,
  current: string | undefined,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (value?: string) => {
    if (!value || seen.has(value)) return;
    seen.add(value);
    out.push(value);
  };
  push(defaultBaseUrl);
  if (provider && COMMON_BASE_URLS[provider]) {
    for (const url of COMMON_BASE_URLS[provider]) push(url);
  }
  push(current);
  return out;
}
