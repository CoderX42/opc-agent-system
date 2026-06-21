import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { THEME } from "../styles/theme";

type Role = "finance" | "service" | "legal" | "admin";

interface Props {
  role: Role;
  title: string;
  features: string[];
  sceneStart: number;
}

const ROLE_COLOR: Record<Role, string> = {
  finance: "#10B981",
  service: "#F59E0B",
  legal: "#8B5CF6",
  admin: "#EC4899",
};

const ROLE_ICON: Record<Role, string> = {
  finance: "💰",
  service: "💬",
  legal: "⚖️",
  admin: "📋",
};

export const SceneAgent: React.FC<Props> = ({ role, title, features, sceneStart }) => {
  const frame = useCurrentFrame();
  const local = Math.max(0, frame - sceneStart);

  const agentColor = ROLE_COLOR[role];
  const ocrProgress = interpolate(local, [10, 35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Mock UI 区域：y=480..1180
  // 标题：y=80
  // 功能 chip 行：y=1240
  const mockY = 480;
  const mockH = 700;

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at center, ${agentColor}35, #0F172A 70%)`,
      fontFamily: THEME.fontFamily,
      color: THEME.text,
    }}>
      {/* 标题 */}
      <div style={{
        position: "absolute",
        top: 100, left: 0, right: 0,
        textAlign: "center",
      }}>
        <div style={{
          fontSize: 76, fontWeight: 900, color: agentColor,
          textShadow: `0 0 30px ${agentColor}80`,
          display: "inline-flex", alignItems: "center", gap: 20,
        }}>
          <span style={{ fontSize: 90 }}>{ROLE_ICON[role]}</span>
          {title}
        </div>
      </div>

      {/* Mock UI - 财务：发票 OCR */}
      {role === "finance" && (
        <>
          <div style={{
            position: "absolute",
            top: mockY, left: 80,
            width: 360, height: mockH,
            background: "#FEF3C7", borderRadius: 16, padding: 24,
            fontFamily: "monospace", fontSize: 16, color: "#78350F",
            boxShadow: `0 20px 60px rgba(0,0,0,0.5)`,
          }}>
            <div style={{ fontSize: 26, fontWeight: 900, marginBottom: 16, textAlign: "center" }}>增值税专用发票</div>
            <div style={{ borderBottom: "1px dashed #78350F", paddingBottom: 10, marginBottom: 10 }}>发票号：INV-2024-08-156</div>
            <div style={{ marginBottom: 8 }}>购买方：XX 有限公司</div>
            <div style={{ marginBottom: 8 }}>销售方：YY 科技公司</div>
            <div style={{ marginBottom: 16, fontSize: 14 }}>日期：2024-08-15</div>
            <div style={{ borderTop: "1px dashed #78350F", paddingTop: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>办公用品</span><span>¥12,580.00</span>
              </div>
            </div>
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 5,
              background: agentColor, boxShadow: `0 0 16px ${agentColor}`,
              transform: `translateY(${ocrProgress * 100}%)`,
            }} />
          </div>
          <div style={{
            position: "absolute",
            top: mockY, left: 480, width: 520, height: mockH,
            background: "rgba(15,23,42,0.95)",
            border: `1px solid ${agentColor}60`,
            borderRadius: 16, padding: 28,
            display: "flex", flexDirection: "column", gap: 18,
            boxShadow: `0 20px 60px rgba(0,0,0,0.5)`,
          }}>
            <div style={{ fontSize: 26, color: agentColor, fontWeight: 700 }}>📊 OCR 识别结果</div>
            {[
              { label: "发票号", value: "INV-2024-08-156", show: ocrProgress > 0.3 },
              { label: "金额", value: "¥ 12,580.00", show: ocrProgress > 0.5, hl: true },
              { label: "类别", value: "办公用品 · 自动归类", show: ocrProgress > 0.7 },
              { label: "状态", value: "✓ 已入账", show: ocrProgress > 0.9, ok: true },
            ].map((f, i) => (
              <div key={i} style={{ opacity: f.show ? 1 : 0.25 }}>
                <div style={{ fontSize: 18, color: THEME.textMuted, marginBottom: 6 }}>{f.label}</div>
                <div style={{
                  fontSize: 30, fontWeight: 700,
                  color: f.hl ? "#FBBF24" : f.ok ? "#10B981" : THEME.text,
                }}>
                  {f.show ? f.value : "······"}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Mock UI - 客服：聊天 */}
      {role === "service" && (
        <div style={{
          position: "absolute",
          top: mockY, left: 120, width: 840, height: mockH,
          background: "rgba(15,23,42,0.95)",
          border: `1px solid ${agentColor}60`,
          borderRadius: 16, padding: 28,
          display: "flex", flexDirection: "column", gap: 16,
          boxShadow: `0 20px 60px rgba(0,0,0,0.5)`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: agentColor, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, boxShadow: `0 0 20px ${agentColor}`,
            }}>💬</div>
            <div>
              <div style={{ fontSize: 24, color: THEME.text, fontWeight: 700 }}>AI 客服 · 小服</div>
              <div style={{ fontSize: 16, color: "#10B981" }}>● 在线 · 7×24h</div>
            </div>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14, justifyContent: "center" }}>
            {[
              { from: "user", text: "你好，我想咨询退款流程" },
              { from: "ai", text: "您好！我是 AI 客服小服。请问订单号？" },
              { from: "user", text: "#20240815-X-056" },
              { from: "ai", text: "已查到订单，金额 ¥580。1-3 个工作日退款到账。" },
            ].map((m, i) => {
              const isUser = m.from === "user";
              return (
                <div key={i} style={{
                  display: "flex", justifyContent: isUser ? "flex-end" : "flex-start",
                }}>
                  <div style={{
                    maxWidth: "70%",
                    background: isUser ? agentColor : "rgba(255,255,255,0.08)",
                    color: isUser ? "#FFFFFF" : THEME.text,
                    padding: "14px 22px", borderRadius: 20,
                    fontSize: 22, lineHeight: 1.4,
                  }}>
                    {m.text}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "14px 20px", background: "rgba(255,255,255,0.06)",
            borderRadius: 28, border: `1px solid ${agentColor}80`,
          }}>
            <span style={{ fontSize: 20, color: THEME.textMuted }}>请输入问题...</span>
            <div style={{
              marginLeft: "auto", background: agentColor,
              padding: "6px 18px", borderRadius: 18,
              color: "#FFFFFF", fontSize: 18, fontWeight: 600,
            }}>发送</div>
          </div>
        </div>
      )}

      {/* Mock UI - 法务：合同 */}
      {role === "legal" && (() => {
        const review = interpolate(local, [10, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const risks = [
          { y: 0.3, text: "违约金比例过高（30%）", color: "#EF4444", label: "🔴 高风险" },
          { y: 0.6, text: "知识产权归属不明确", color: "#F59E0B", label: "🟡 中风险" },
          { y: 0.85, text: "争议解决条款建议补充", color: "#3B82F6", label: "🔵 低风险" },
        ];
        return (
          <>
            <div style={{
              position: "absolute",
              top: mockY, left: 80, width: 540, height: mockH,
              background: "#FFFFFF", borderRadius: 16, padding: 24,
              color: "#1F2937", fontFamily: "serif", fontSize: 16, lineHeight: 1.7,
              boxShadow: `0 20px 60px rgba(0,0,0,0.5)`,
            }}>
              <div style={{ fontSize: 22, fontWeight: 900, textAlign: "center", marginBottom: 16 }}>服务采购合同</div>
              <div>甲方：XX 有限公司</div>
              <div>乙方：YY 科技公司</div>
              <div style={{ marginTop: 14 }}>一、合同金额：人民币 <span style={{ background: review > 0.3 ? "#FEE2E2" : "transparent" }}>12,580.00 元</span></div>
              <div>二、违约金：<span style={{ background: review > 0.5 ? "#FEE2E2" : "transparent" }}>合同总金额的 30%</span></div>
              <div>三、知识产权：<span style={{ background: review > 0.7 ? "#FEF3C7" : "transparent" }}>双方共有</span></div>
              <div>四、争议解决：<span style={{ background: review > 0.85 ? "#DBEAFE" : "transparent" }}>······</span></div>
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 5, background: "rgba(0,0,0,0.05)" }}>
                <div style={{ width: `${review * 100}%`, height: "100%", background: agentColor }} />
              </div>
            </div>
            <div style={{
              position: "absolute",
              top: mockY, left: 660, width: 340, height: mockH,
              display: "flex", flexDirection: "column", gap: 14,
            }}>
              <div style={{ fontSize: 24, color: agentColor, fontWeight: 700, marginBottom: 6 }}>⚖️ 风险审查</div>
              {risks.map((r, i) => {
                const show = review > r.y;
                return (
                  <div key={i} style={{
                    background: show ? `${r.color}30` : "rgba(255,255,255,0.04)",
                    borderLeft: `5px solid ${r.color}`,
                    borderRadius: 10, padding: "14px 18px",
                    fontSize: 18, color: show ? THEME.text : "rgba(255,255,255,0.2)",
                    opacity: show ? 1 : 0.3,
                  }}>
                    <div style={{ fontSize: 14, color: r.color, fontWeight: 700, marginBottom: 4 }}>{r.label}</div>
                    {r.text}
                  </div>
                );
              })}
            </div>
          </>
        );
      })()}

      {/* Mock UI - 行政：日程 */}
      {role === "admin" && (
        <div style={{
          position: "absolute",
          top: mockY, left: 120, width: 840, height: mockH,
          background: "rgba(15,23,42,0.95)",
          border: `1px solid ${agentColor}60`,
          borderRadius: 16, padding: 28,
          boxShadow: `0 20px 60px rgba(0,0,0,0.5)`,
          display: "flex", flexDirection: "column", gap: 14,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 12,
              background: agentColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28,
            }}>📅</div>
            <div>
              <div style={{ fontSize: 26, color: THEME.text, fontWeight: 700 }}>2024-08-15 周四</div>
              <div style={{ fontSize: 16, color: THEME.textMuted }}>AI 自动安排 · 智能推荐</div>
            </div>
          </div>
          {[
            { time: "09:00", title: "晨会", icon: "☀️" },
            { time: "10:30", title: "客户对接", icon: "🤝" },
            { time: "14:00", title: "产品评审", icon: "📋" },
            { time: "16:00", title: "周报撰写", icon: "✍️" },
          ].map((e, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 20,
              background: "rgba(255,255,255,0.06)",
              borderLeft: `5px solid ${agentColor}`,
              borderRadius: 10, padding: "16px 20px",
            }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: agentColor, minWidth: 100, fontFamily: "monospace" }}>{e.time}</div>
              <div style={{ fontSize: 28 }}>{e.icon}</div>
              <div style={{ fontSize: 24, color: THEME.text, fontWeight: 600 }}>{e.title}</div>
              <div style={{
                marginLeft: "auto", fontSize: 14, color: "#10B981",
                padding: "6px 14px", background: "rgba(16,185,129,0.15)", borderRadius: 14,
              }}>AI 已优化</div>
            </div>
          ))}
        </div>
      )}

      {/* 功能 chip 行 */}
      <div style={{
        position: "absolute",
        top: 1240, left: 0, right: 0,
        display: "flex", gap: 20, justifyContent: "center",
      }}>
        {features.map((feat, i) => (
          <div key={i} style={{
            background: `${agentColor}30`,
            border: `2px solid ${agentColor}`,
            color: THEME.text,
            padding: "16px 32px",
            borderRadius: 36,
            fontSize: 30, fontWeight: 600,
            backdropFilter: "blur(8px)",
          }}>
            {feat}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};