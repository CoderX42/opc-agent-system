import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

export type AvatarRole = "finance" | "service" | "legal" | "admin";

const ROLE_COLORS: Record<AvatarRole, { bg: string; accent: string; icon: string; name: string }> = {
  finance: { bg: "#10B981", accent: "#064E3B", icon: "💰", name: "小财" },
  service: { bg: "#F59E0B", accent: "#78350F", icon: "💬", name: "小服" },
  legal:   { bg: "#8B5CF6", accent: "#4C1D95", icon: "⚖️", name: "小法" },
  admin:   { bg: "#EC4899", accent: "#831843", icon: "📋", name: "小行" },
};

interface AvatarProps {
  role: AvatarRole;
  size?: number;
  delay?: number;        // 入场延迟（帧）
  blinking?: boolean;
  bouncing?: boolean;
}

/**
 * 拟人化 AI 数字员工头像
 * - 纯 SVG，无外部资源依赖
 * - 支持眨眼、弹跳、呼吸动画
 */
export const Avatar: React.FC<AvatarProps> = ({
  role,
  size = 280,
  delay = 0,
  blinking = true,
  bouncing = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const color = ROLE_COLORS[role];

  // 入场弹簧动画
  const enter = spring({
    frame: frame - delay,
    fps,
    config: { damping: 12, stiffness: 100, mass: 0.8 },
  });

  // 持续弹跳
  const bounce = bouncing
    ? Math.sin((frame - delay) * 0.12) * 8 * Math.max(0, enter)
    : 0;

  // 呼吸缩放
  const breath = bouncing
    ? 1 + Math.sin((frame - delay) * 0.08) * 0.02
    : 1;

  // 眨眼：每 90 帧一次，持续 6 帧
  const blinkPhase = (frame - delay) % 90;
  const blinkScaleY = blinking && blinkPhase < 6
    ? interpolate(blinkPhase, [0, 3, 6], [1, 0.1, 1], { extrapolateRight: "clamp" })
    : 1;

  const translateY = interpolate(enter, [0, 1], [200, 0]);

  return (
    <div
      style={{
        width: size,
        height: size,
        transform: `translateY(${translateY + bounce}px) scale(${enter * breath})`,
        position: "relative",
      }}
    >
      <svg viewBox="0 0 200 200" width={size} height={size}>
        {/* 背景光晕 */}
        <defs>
          <radialGradient id={`glow-${role}`} cx="50%" cy="50%">
            <stop offset="0%" stopColor={color.bg} stopOpacity="0.6" />
            <stop offset="100%" stopColor={color.bg} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`body-${role}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color.bg} />
            <stop offset="100%" stopColor={color.accent} />
          </linearGradient>
        </defs>

        <circle cx="100" cy="100" r="98" fill={`url(#glow-${role})`} />

        {/* 身体（圆角矩形/肩膀） */}
        <ellipse cx="100" cy="170" rx="60" ry="35" fill={`url(#body-${role})`} />

        {/* 头部圆 */}
        <circle cx="100" cy="90" r="55" fill="#FDE68A" />

        {/* 头发/帽檐 */}
        <path
          d="M 50 75 Q 100 30 150 75 L 150 60 Q 100 20 50 60 Z"
          fill={color.accent}
        />

        {/* 眼睛 */}
        <g transform={`translate(100 90) scale(1 ${blinkScaleY})`}>
          <circle cx="-18" cy="0" r="6" fill="#1F2937" />
          <circle cx="18" cy="0" r="6" fill="#1F2937" />
          {/* 眼睛高光 */}
          <circle cx="-16" cy="-2" r="2" fill="#FFFFFF" />
          <circle cx="20" cy="-2" r="2" fill="#FFFFFF" />
        </g>

        {/* 腮红 */}
        <circle cx="70" cy="105" r="6" fill="#FCA5A5" opacity="0.6" />
        <circle cx="130" cy="105" r="6" fill="#FCA5A5" opacity="0.6" />

        {/* 嘴 */}
        <path
          d="M 88 112 Q 100 122 112 112"
          stroke="#1F2937"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />

        {/* 胸前徽章（图标） */}
        <circle cx="100" cy="170" r="22" fill="#FFFFFF" />
        <text
          x="100"
          y="180"
          textAnchor="middle"
          fontSize="28"
          fontFamily="sans-serif"
        >
          {color.icon}
        </text>
      </svg>
    </div>
  );
};

interface AvatarNameTagProps {
  role: AvatarRole;
  delay?: number;
}

export const AvatarNameTag: React.FC<AvatarNameTagProps> = ({ role, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const color = ROLE_COLORS[role];

  const enter = spring({
    frame: frame - delay,
    fps,
    config: { damping: 15 },
  });

  return (
    <div
      style={{
        marginTop: -20,
        padding: "8px 24px",
        borderRadius: 24,
        background: color.bg,
        color: "#FFFFFF",
        fontSize: 36,
        fontWeight: 700,
        fontFamily: '"PingFang SC", system-ui, sans-serif',
        opacity: enter,
        transform: `scale(${enter})`,
        boxShadow: `0 8px 24px ${color.bg}80`,
      }}
    >
      AI · {color.name}
    </div>
  );
};