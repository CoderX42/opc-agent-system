import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, random } from "remotion";
import { THEME } from "../styles/theme";

interface BackgroundProps {
  variant?: "default" | "agent" | "cta";
  agentColor?: string;
}

/**
 * 动态粒子背景 + 渐变
 */
export const Background: React.FC<BackgroundProps> = ({ variant = "default", agentColor }) => {
  const frame = useCurrentFrame();

  // 浮动粒子（确定性随机）
  const particles = React.useMemo(() => {
    return new Array(30).fill(0).map((_, i) => ({
      x: random(`p${i}-x`) * 100,
      y: random(`p${i}-y`) * 100,
      size: random(`p${i}-s`) * 4 + 2,
      speed: random(`p${i}-sp`) * 0.5 + 0.2,
      delay: random(`p${i}-d`) * 30,
    }));
  }, []);

  const gradient =
    variant === "agent" && agentColor
      ? `radial-gradient(ellipse at center, ${agentColor}30 0%, ${THEME.bg} 70%)`
      : variant === "cta"
      ? `linear-gradient(180deg, ${THEME.primaryDark} 0%, ${THEME.bg} 60%)`
      : `linear-gradient(180deg, ${THEME.bgGradient[0]} 0%, ${THEME.bgGradient[1]} 50%, ${THEME.bgGradient[2]} 100%)`;

  return (
    <AbsoluteFill style={{ background: gradient }}>
      {/* 网格底纹 */}
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* 浮动粒子 */}
      {particles.map((p, i) => {
        const y = ((frame - p.delay) * p.speed) % 110 - 5;
        const opacity = interpolate(y, [0, 50, 100], [0, 0.6, 0], {
          extrapolateRight: "clamp",
        });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${p.x}%`,
              top: `${y}%`,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: THEME.secondary,
              opacity,
              boxShadow: `0 0 ${p.size * 4}px ${THEME.secondary}`,
            }}
          />
        );
      })}

      {/* 顶部光晕 */}
      <div
        style={{
          position: "absolute",
          top: -300,
          left: "50%",
          transform: "translateX(-50%)",
          width: 800,
          height: 800,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${THEME.primary}30 0%, transparent 70%)`,
          filter: "blur(40px)",
        }}
      />
    </AbsoluteFill>
  );
};