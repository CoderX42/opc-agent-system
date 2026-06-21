# OPC Agent System 抖音宣传视频

> 基于 **Remotion** 程序化生成的 30 秒抖音竖屏宣传视频。

## 视频规格

| 项目 | 值 |
|------|-----|
| 分辨率 | 1080 × 1920（抖音竖屏） |
| 时长 | 30 秒 |
| 帧率 | 30 fps |
| 总帧数 | 900 |
| 风格 | 拟人数字员工 IP（4 个卡通 AI 员工） |
| 配音 | 无（纯文字字幕） |

## 分镜脚本

| 时间 | 段落 | 内容 |
|------|------|------|
| 0-3s | Hook | "1 个人 = 4 个 AI 员工？" |
| 3-7s | Pain | 财务/客服/法务/行政四大痛点 |
| 7-9s | Intro | "现在，全部交给 AI 数字员工" |
| 9-13s | 财务 Agent | 小财：发票识别/记账/税务 |
| 13-17s | 客服 Agent | 小服：智能问答/工单/多渠道 |
| 17-21s | 法务 Agent | 小法：合同审查/合规 |
| 21-25s | 行政 Agent | 小行：日程/任务/会议 |
| 25-28s | CTA | 全栈开源 · 技术栈展示 |
| 28-30s | End | GitHub 地址 + Star 引导 |

## 快速开始

### 1. 安装依赖

```bash
cd videos
pnpm install   # 或 npm install / yarn
```

### 2. 预览（打开 Studio）

```bash
pnpm start
```

浏览器会自动打开 `http://localhost:3000`，可实时预览与调试。

### 3. 渲染 MP4

```bash
pnpm build
```

输出文件：`out/opc-promo.mp4`

### 4. 渲染 GIF（适合预览图）

```bash
pnpm build:preview
```

## 自定义配置

### 修改文案
直接编辑 `src/scenes/SceneAgent.tsx` 等场景组件中的文字。

### 调整时长
修改 `src/Root.tsx` 中的 `DURATION_SECONDS`，并同步 `src/styles/theme.ts` 中的 `TIMELINE`。

### 换品牌色
修改 `src/styles/theme.ts`：
```ts
export const THEME = {
  primary: "#6366F1",   // 主色
  secondary: "#22D3EE", // 辅色
  agents: {
    finance: "#10B981",
    service: "#F59E0B",
    legal:   "#8B5CF6",
    admin:   "#EC4899",
  },
  ...
};
```

### 替换头像
当前使用纯 SVG 卡通形象。如需替换为 PNG：
1. 把素材放入 `public/avatars/{role}.png`
2. 在 `Avatar.tsx` 中用 `<Img>` 组件替换 SVG

## 目录结构

```
videos/
├── src/
│   ├── compositions/
│   │   └── OpcPromo.tsx         # 主合成
│   ├── components/
│   │   ├── Avatar.tsx           # 卡通头像 IP
│   │   └── Background.tsx       # 动态背景
│   ├── scenes/
│   │   ├── SceneHook.tsx
│   │   ├── ScenePain.tsx
│   │   ├── SceneIntro.tsx
│   │   ├── SceneAgent.tsx       # 通用 Agent 演示
│   │   ├── SceneCTA.tsx
│   │   └── SceneEnd.tsx
│   ├── styles/
│   │   └── theme.ts             # 主题与时间轴常量
│   ├── Root.tsx                 # Composition 声明
│   └── index.ts
├── remotion.config.ts
├── tsconfig.json
└── package.json
```

## 渲染性能建议

- 默认启用 4 并发渲染。如机器性能好可调到 8：`Config.setConcurrency(8)`
- 渲染 30 秒视频约需 2-5 分钟（取决于 CPU）
- 输出 mp4 默认 H.264 编码，兼容抖音、B 站、小红书等平台

## 上传抖音注意事项

1. **导出分辨率**：确保 1080×1920
2. **导出帧率**：30fps（抖音最佳）
3. **音频**：当前无音轨，可在剪映中添加背景音乐（BGM）
4. **封面**：建议用 `pnpm build:preview` 生成 GIF，抽帧作为封面
5. **文件大小**：mp4 一般 < 30MB，符合抖音限制

## 推荐 BGM（剪映 / 抖音音乐库）

- 节奏感电子乐：`Tech House` / `Future Bass`
- 活泼可爱：`Cute Pop` / `Lo-fi`  
- 高燃：`Epic Cinematic`

---

## TODO（可选优化）

- [ ] 添加 TTS 配音
- [ ] 用 Lottie 动画替换 SVG 头像
- [ ] 增加更多场景变体（不同受众版本）
- [ ] 接入 GitHub API 拉取真实 Star 数