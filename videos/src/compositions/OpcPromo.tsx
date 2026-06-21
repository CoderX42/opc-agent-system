import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { TIMELINE } from "../styles/theme";
import { SceneHook } from "../scenes/SceneHook";
import { ScenePain } from "../scenes/ScenePain";
import { SceneIntro } from "../scenes/SceneIntro";
import { SceneAgent } from "../scenes/SceneAgent";
import { SceneCTA } from "../scenes/SceneCTA";
import { SceneEnd } from "../scenes/SceneEnd";

export const OpcPromo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#0F172A" }}>
      <Sequence from={TIMELINE.hook.start} durationInFrames={TIMELINE.hook.end - TIMELINE.hook.start}>
        <SceneHook sceneStart={TIMELINE.hook.start} />
      </Sequence>

      <Sequence from={TIMELINE.pain.start} durationInFrames={TIMELINE.pain.end - TIMELINE.pain.start}>
        <ScenePain sceneStart={TIMELINE.pain.start} />
      </Sequence>

      <Sequence from={TIMELINE.intro.start} durationInFrames={TIMELINE.intro.end - TIMELINE.intro.start}>
        <SceneIntro sceneStart={TIMELINE.intro.start} />
      </Sequence>

      <Sequence from={TIMELINE.finance.start} durationInFrames={TIMELINE.finance.end - TIMELINE.finance.start}>
        <SceneAgent role="finance" title="AI 财务员 · 小财"
          features={["📷 OCR 识别发票", "📈 一键生成报表", "⏰ 税务提前提醒"]}
          sceneStart={TIMELINE.finance.start}
          sceneDuration={TIMELINE.finance.end - TIMELINE.finance.start} />
      </Sequence>

      <Sequence from={TIMELINE.service.start} durationInFrames={TIMELINE.service.end - TIMELINE.service.start}>
        <SceneAgent role="service" title="AI 客服员 · 小服"
          features={["💬 7×24 智能问答", "🎫 自动建单流转", "🌐 多渠道接入"]}
          sceneStart={TIMELINE.service.start}
          sceneDuration={TIMELINE.service.end - TIMELINE.service.start} />
      </Sequence>

      <Sequence from={TIMELINE.legal.start} durationInFrames={TIMELINE.legal.end - TIMELINE.legal.start}>
        <SceneAgent role="legal" title="AI 法务员 · 小法"
          features={["📝 合同秒级审查", "🚨 风险条款高亮", "📚 合规自动归档"]}
          sceneStart={TIMELINE.legal.start}
          sceneDuration={TIMELINE.legal.end - TIMELINE.legal.start} />
      </Sequence>

      <Sequence from={TIMELINE.admin.start} durationInFrames={TIMELINE.admin.end - TIMELINE.admin.start}>
        <SceneAgent role="admin" title="AI 行政员 · 小行"
          features={["🗓️ 智能日程安排", "✅ 任务自动拆解", "📋 会议纪要生成"]}
          sceneStart={TIMELINE.admin.start}
          sceneDuration={TIMELINE.admin.end - TIMELINE.admin.start} />
      </Sequence>

      <Sequence from={TIMELINE.cta.start} durationInFrames={TIMELINE.cta.end - TIMELINE.cta.start}>
        <SceneCTA sceneStart={TIMELINE.cta.start} />
      </Sequence>

      <Sequence from={TIMELINE.end.start} durationInFrames={TIMELINE.end.end - TIMELINE.end.start}>
        <SceneEnd sceneStart={TIMELINE.end.start} />
      </Sequence>

      <ProgressBar />
    </AbsoluteFill>
  );
};

const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = frame / durationInFrames;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 6,
        background: "rgba(255,255,255,0.15)",
        zIndex: 99,
      }}
    >
      <div
        style={{
          width: `${progress * 100}%`,
          height: "100%",
          background: "linear-gradient(90deg, #22D3EE, #6366F1)",
          boxShadow: "0 0 10px #6366F1",
        }}
      />
    </div>
  );
};