// 主题色与动效常量
export const THEME = {
  // 主品牌色
  primary: "#6366F1",      // Indigo 500
  primaryDark: "#4F46E5",
  secondary: "#22D3EE",    // Cyan 400

  // 4 个 Agent 主题色
  agents: {
    finance: "#10B981",      // Emerald
    service: "#F59E0B",      // Amber
    legal:   "#8B5CF6",      // Violet
    admin:   "#EC4899",      // Pink
  },

  // 中性色
  bg: "#0F172A",            // Slate 900
  bgGradient: ["#0F172A", "#1E293B", "#312E81"] as const,
  text: "#F8FAFC",
  textMuted: "#94A3B8",

  // 字体
  fontFamily: '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", system-ui, sans-serif',
} as const;

// 时间轴（帧 @30fps）
export const TIMELINE = {
  hook:    { start: 0,   end: 90  },  // 0-3s
  pain:    { start: 90,  end: 210 },  // 3-7s
  intro:   { start: 210, end: 270 },  // 7-9s
  finance: { start: 270, end: 390 },  // 9-13s
  service: { start: 390, end: 510 },  // 13-17s
  legal:   { start: 510, end: 630 },  // 17-21s
  admin:   { start: 630, end: 750 },  // 21-25s
  cta:     { start: 750, end: 840 },  // 25-28s
  end:     { start: 840, end: 900 },  // 28-30s
} as const;

export type AgentKey = keyof typeof TIMELINE;