import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { THEME } from "../styles/theme";

interface Props { sceneStart: number }

const PAIN_ITEMS = [
  { icon: "📊", text: "财务", desc: "月底加班到凌晨" },
  { icon: "📞", text: "客服", desc: "7×24 小时待命" },
  { icon: "📑", text: "法务", desc: "合同条款不敢签" },
  { icon: "📅", text: "行政", desc: "日程会议乱如麻" },
];

export const ScenePain: React.FC<Props> = ({ sceneStart }) => {
  const frame = useCurrentFrame();
  const local = Math.max(0, frame - sceneStart);

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(180deg, #1E1B4B, #312E81, #0F172A)`,
      fontFamily: THEME.fontFamily,
      color: THEME.text,
      padding: 80,
    }}>
      {/* 标题 - 用绝对定位避免 flex 嵌套问题 */}
      <div style={{
        position: "absolute",
        top: 120, left: 0, right: 0,
        textAlign: "center",
        fontSize: 72, color: "#FCA5A5", fontWeight: 700,
      }}>
        但是……😩
      </div>

      <div style={{
        position: "absolute",
        top: 220, left: 0, right: 0,
        textAlign: "center",
        fontSize: 32, color: THEME.textMuted,
      }}>
        一个人扛下所有？
      </div>

      {/* 4 张卡片 - 用 absolute 定位 */}
      {PAIN_ITEMS.map((item, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const cardWidth = 420;
        const cardHeight = 380;
        const gap = 30;
        const totalW = cardWidth * 2 + gap;
        const startX = (1080 - totalW) / 2;
        const x = startX + col * (cardWidth + gap);
        const y = 380 + row * (cardHeight + gap);

        return (
          <div key={i} style={{
            position: "absolute",
            top: y, left: x,
            width: cardWidth, height: cardHeight,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 24,
            padding: "32px 28px",
            backdropFilter: "blur(12px)",
            color: THEME.text,
          }}>
            <div style={{
              position: "absolute", top: 12, right: 12,
              width: 48, height: 48, borderRadius: "50%",
              background: "#EF4444",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, color: "#FFFFFF", fontWeight: 900,
            }}>
              ✗
            </div>
            <div style={{ fontSize: 90, marginBottom: 16 }}>{item.icon}</div>
            <div style={{ fontSize: 56, fontWeight: 800, marginBottom: 12 }}>{item.text}</div>
            <div style={{ fontSize: 28, color: "#FCA5A5" }}>{item.desc}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};