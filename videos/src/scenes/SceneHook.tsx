import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { THEME } from "../styles/theme";

interface Props { sceneStart: number }

export const SceneHook: React.FC<Props> = ({ sceneStart }) => {
  const frame = useCurrentFrame();
  const local = Math.max(0, frame - sceneStart);

  const countValue = Math.floor(interpolate(local, [10, 50], [0, 4], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  }));

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(180deg, #0F172A, #1E293B, #312E81)`,
      fontFamily: THEME.fontFamily,
      color: THEME.text,
    }}>
      {/* 副标题 */}
      <div style={{
        position: "absolute",
        top: 380, left: 0, right: 0, textAlign: "center",
        fontSize: 44, color: THEME.secondary, fontWeight: 600, letterSpacing: 8,
      }}>
        开 一 家 一 人 公 司
      </div>

      {/* 主标题第一行 */}
      <div style={{
        position: "absolute",
        top: 500, left: 0, right: 0, textAlign: "center",
        fontSize: 130, fontWeight: 900, lineHeight: 1.1,
        textShadow: `0 0 60px ${THEME.primary}80`,
      }}>
        <span style={{ color: THEME.secondary }}>1</span>
        <span style={{ fontSize: 90 }}> 个人 </span>
        <span style={{ color: "#FFFFFF" }}>=</span>
      </div>

      {/* 主标题第二行 */}
      <div style={{
        position: "absolute",
        top: 680, left: 0, right: 0,
        display: "flex", justifyContent: "center", alignItems: "center", gap: 12,
      }}>
        <span style={{
          fontSize: 130, fontWeight: 900, color: "#F472B6",
          textShadow: "0 0 30px #F472B6",
          display: "inline-block", minWidth: 150, textAlign: "center",
        }}>
          {countValue}
        </span>
        <span style={{ fontSize: 90, color: THEME.text }}>个 AI 员工</span>
        <span style={{ fontSize: 150, color: "#FBBF24", fontWeight: 900 }}>？</span>
      </div>

      {/* 底部小字 */}
      <div style={{
        position: "absolute",
        bottom: 200, left: 0, right: 0, textAlign: "center",
        fontSize: 28, color: THEME.textMuted, letterSpacing: 4,
      }}>
        一人公司（OPC）= One Person Company
      </div>

      {/* 闪光装饰球 */}
      <div style={{
        position: "absolute",
        top: 280, right: 100,
        width: 50, height: 50, borderRadius: "50%",
        background: THEME.secondary,
        boxShadow: `0 0 50px ${THEME.secondary}`,
      }} />
      <div style={{
        position: "absolute",
        bottom: 500, left: 100,
        width: 35, height: 35, borderRadius: "50%",
        background: "#F472B6",
        boxShadow: `0 0 40px #F472B6`,
      }} />
    </AbsoluteFill>
  );
};