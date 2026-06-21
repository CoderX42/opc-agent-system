import React from "react";
import { AbsoluteFill } from "remotion";
import { THEME } from "../styles/theme";

interface Props { sceneStart: number }

export const SceneIntro: React.FC<Props> = () => {
  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at center, #6366F160, #1E1B4B 50%, #0F172A 90%)`,
      fontFamily: THEME.fontFamily,
      color: THEME.text,
    }}>
      {/* 主标题 - 顶部 */}
      <div style={{
        position: "absolute",
        top: 600, left: 0, right: 0, textAlign: "center",
      }}>
        <div style={{
          fontSize: 130, fontWeight: 900, color: THEME.text, lineHeight: 1.2,
          textShadow: `0 0 80px ${THEME.primary}, 0 0 30px ${THEME.secondary}`,
        }}>
          现在 ✨
          <br />
          <span style={{
            background: `linear-gradient(90deg, ${THEME.secondary}, ${THEME.primary})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            WebkitTextStrokeWidth: 1,
            paintOrder: "stroke",
          }}>
            全部交给 AI 数字员工
          </span>
        </div>
      </div>

      {/* 副标题 - 底部 */}
      <div style={{
        position: "absolute",
        bottom: 400, left: 0, right: 0, textAlign: "center",
        fontSize: 40, color: THEME.secondary, fontWeight: 600,
        letterSpacing: 8,
      }}>
        4 大场景 · 一套搞定
      </div>

      {/* 装饰圆环 */}
      <div style={{
        position: "absolute",
        top: 400, left: "50%",
        transform: "translateX(-50%)",
        width: 600, height: 600, borderRadius: "50%",
        border: `3px solid ${THEME.primary}40`,
      }} />
      <div style={{
        position: "absolute",
        top: 500, left: "50%",
        transform: "translateX(-50%)",
        width: 400, height: 400, borderRadius: "50%",
        border: `2px solid ${THEME.secondary}60`,
      }} />

      {/* 辐射粒子 */}
      {[
        { x: 200, y: 800, c: "#10B981" },
        { x: 880, y: 800, c: "#F59E0B" },
        { x: 200, y: 1200, c: "#8B5CF6" },
        { x: 880, y: 1200, c: "#EC4899" },
        { x: 100, y: 1000, c: "#22D3EE" },
        { x: 980, y: 1000, c: "#22D3EE" },
        { x: 540, y: 200, c: "#6366F1" },
        { x: 540, y: 1700, c: "#6366F1" },
      ].map((p, i) => (
        <div key={i} style={{
          position: "absolute",
          top: p.y, left: p.x,
          width: 16, height: 16, borderRadius: "50%",
          background: p.c,
          boxShadow: `0 0 24px ${p.c}`,
        }} />
      ))}
    </AbsoluteFill>
  );
};