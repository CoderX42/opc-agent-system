import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { THEME } from "../styles/theme";

interface Props { sceneStart: number }

export const SceneEnd: React.FC<Props> = ({ sceneStart }) => {
  const frame = useCurrentFrame();
  const local = Math.max(0, frame - sceneStart);
  const starCount = Math.floor(interpolate(local, [15, 50], [0, 1280], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  }));

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(180deg, #0F172A, #1E1B4B, #4F46E5)`,
      fontFamily: THEME.fontFamily,
      color: THEME.text,
    }}>
      {/* Logo */}
      <div style={{
        position: "absolute",
        top: 280, left: "50%",
        transform: "translateX(-50%)",
        width: 200, height: 200, borderRadius: 40,
        background: `linear-gradient(135deg, ${THEME.primary}, ${THEME.secondary})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 90, fontWeight: 900, color: "#FFFFFF",
        boxShadow: `0 20px 60px ${THEME.primary}AA`,
      }}>
        OPC
      </div>

      {/* 标题 */}
      <div style={{
        position: "absolute",
        top: 520, left: 0, right: 0, textAlign: "center",
        fontSize: 60, fontWeight: 800,
      }}>
        OPC Agent System
      </div>

      {/* Star 计数 */}
      <div style={{
        position: "absolute",
        top: 620, left: 0, right: 0,
        display: "flex", justifyContent: "center", alignItems: "center", gap: 14,
      }}>
        <span style={{ fontSize: 44 }}>⭐</span>
        <span style={{ fontSize: 56, fontWeight: 800, color: "#FBBF24" }}>{starCount}</span>
        <span style={{ fontSize: 28, color: THEME.textMuted }}>关注收藏</span>
      </div>

      {/* 底部小字 */}
      <div style={{
        position: "absolute",
        top: 740, left: 0, right: 0, textAlign: "center",
        fontSize: 32, color: THEME.textMuted,
      }}>
        点赞 · 关注 · 收藏 ✨
      </div>

      {/* 装饰星点 */}
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        const radius = 600;
        const x = 540 + Math.cos(angle) * radius;
        const y = 960 + Math.sin(angle) * radius;
        return (
          <div key={i} style={{
            position: "absolute",
            top: y, left: x,
            width: 8, height: 8, borderRadius: "50%",
            background: i % 2 === 0 ? THEME.primary : THEME.secondary,
            boxShadow: `0 0 16px ${i % 2 === 0 ? THEME.primary : THEME.secondary}`,
          }} />
        );
      })}
    </AbsoluteFill>
  );
};