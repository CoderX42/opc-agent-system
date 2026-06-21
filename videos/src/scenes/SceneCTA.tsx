import React from "react";
import { AbsoluteFill } from "remotion";
import { THEME } from "../styles/theme";

interface Props { sceneStart: number }

const ROLES = [
  { color: "#10B981", icon: "💰" },
  { color: "#F59E0B", icon: "💬" },
  { color: "#8B5CF6", icon: "⚖️" },
  { color: "#EC4899", icon: "📋" },
];

const STATS = [
  { value: "80%", label: "节省时间", icon: "⏱️" },
  { value: "7×24", label: "在线服务", icon: "🌐" },
  { value: "0", label: "元工资", icon: "💸" },
];

const TECH = ["Vue 3", "NestJS", "DeepSeek", "Ollama", "RAG", "uni-app"];

export const SceneCTA: React.FC<Props> = () => {
  return (
    <AbsoluteFill style={{
      background: `linear-gradient(180deg, #4F46E5, #1E1B4B, #0F172A)`,
      fontFamily: THEME.fontFamily,
      color: THEME.text,
    }}>
      {/* 标题 */}
      <div style={{
        position: "absolute",
        top: 100, left: 0, right: 0, textAlign: "center",
      }}>
        <div style={{
          fontSize: 80, fontWeight: 900, color: THEME.text,
          textShadow: `0 0 40px ${THEME.primary}80`,
        }}>
          一套系统 · 四位 AI 员工 ✨
        </div>
      </div>

      {/* 副标题 */}
      <div style={{
        position: "absolute",
        top: 220, left: 0, right: 0, textAlign: "center",
        fontSize: 32, color: THEME.textMuted,
      }}>
        全栈开源 · 立即可用
      </div>

      {/* 四人小合影 */}
      <div style={{
        position: "absolute",
        top: 320, left: 0, right: 0,
        display: "flex", justifyContent: "center", gap: 24,
      }}>
        {ROLES.map((r) => (
          <div key={r.icon} style={{
            width: 140, height: 140, borderRadius: "50%",
            background: `linear-gradient(135deg, ${r.color}, ${r.color}AA)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 70, boxShadow: `0 10px 40px ${r.color}AA`,
          }}>
            {r.icon}
          </div>
        ))}
      </div>

      {/* 数据统计条 */}
      <div style={{
        position: "absolute",
        top: 540, left: 0, right: 0,
        display: "flex", justifyContent: "center", gap: 32,
      }}>
        {STATS.map((stat) => (
          <div key={stat.label} style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(99, 102, 241, 0.4)",
            borderRadius: 24, padding: "28px 40px",
            textAlign: "center", minWidth: 250,
            backdropFilter: "blur(10px)",
          }}>
            <div style={{ fontSize: 50, marginBottom: 8 }}>{stat.icon}</div>
            <div style={{ fontSize: 72, fontWeight: 900, color: THEME.secondary, lineHeight: 1 }}>{stat.value}</div>
            <div style={{ fontSize: 28, color: THEME.textMuted, marginTop: 8 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* 副标题2：技术栈 */}
      <div style={{
        position: "absolute",
        top: 870, left: 0, right: 0, textAlign: "center",
        fontSize: 30, color: THEME.textMuted, letterSpacing: 4,
      }}>
        核心技术栈
      </div>

      {/* 技术栈 chip */}
      <div style={{
        position: "absolute",
        top: 940, left: 0, right: 0,
        display: "flex", flexWrap: "wrap", gap: 20, justifyContent: "center", padding: "0 60px",
      }}>
        {TECH.map((tech) => (
          <div key={tech} style={{
            background: "rgba(99, 102, 241, 0.25)",
            border: `2px solid ${THEME.primary}`,
            color: THEME.text, padding: "16px 32px",
            borderRadius: 36, fontSize: 34, fontWeight: 700,
            boxShadow: `0 4px 20px ${THEME.primary}40`,
          }}>
            {tech}
          </div>
        ))}
      </div>

      {/* 底部小字 */}
      <div style={{
        position: "absolute",
        bottom: 100, left: 0, right: 0, textAlign: "center",
        fontSize: 28, color: THEME.textMuted, letterSpacing: 6,
      }}>
        全栈开源 · 立即可用
      </div>
    </AbsoluteFill>
  );
};