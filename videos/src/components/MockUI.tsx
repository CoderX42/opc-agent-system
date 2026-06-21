import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { THEME } from "../styles/theme";

interface MockProps {
  startFrame: number;     // mock 出现的本地帧
  agentColor: string;
}

/**
 * 财务 Agent - 发票 OCR Mock
 * 左侧：发票图片  →  右侧：识别后的交易记录
 */
export const MockInvoice: React.FC<MockProps> = ({ startFrame, agentColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = Math.max(0, frame - startFrame);

  const enter = spring({ frame: local, fps, config: { damping: 14 } });
  const ocrProgress = interpolate(local, [10, 35], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const fields = [
    { label: "发票号", value: "INV-2024-08-156", revealed: ocrProgress > 0.3 },
    { label: "金额", value: "¥ 12,580.00", revealed: ocrProgress > 0.5, highlight: true },
    { label: "类别", value: "办公用品 · 自动归类", revealed: ocrProgress > 0.7 },
    { label: "状态", value: "✓ 已入账", revealed: ocrProgress > 0.9, success: true },
  ];

  return (
    <div
      style={{
        background: "rgba(15, 23, 42, 0.85)",
        border: `1px solid ${agentColor}40`,
        borderRadius: 20,
        padding: 24,
        display: "flex",
        gap: 24,
        opacity: enter,
        transform: `translateY(${interpolate(enter, [0, 1], [30, 0])}px)`,
        backdropFilter: "blur(20px)",
        boxShadow: `0 20px 60px rgba(0,0,0,0.4), 0 0 40px ${agentColor}30`,
      }}
    >
      {/* 左侧：发票图 */}
      <div
        style={{
          width: 280,
          height: 360,
          background: "#FEF3C7",
          borderRadius: 12,
          padding: 20,
          position: "relative",
          fontFamily: "monospace",
          fontSize: 14,
          color: "#78350F",
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 12, textAlign: "center" }}>
          增值税专用发票
        </div>
        <div style={{ borderBottom: "1px dashed #78350F", paddingBottom: 8, marginBottom: 8 }}>
          发票号：INV-2024-08-156
        </div>
        <div style={{ marginBottom: 6 }}>购买方：XX 有限公司</div>
        <div style={{ marginBottom: 6 }}>销售方：YY 科技公司</div>
        <div style={{ marginBottom: 12, fontSize: 12 }}>日期：2024-08-15</div>
        <div style={{ borderTop: "1px dashed #78350F", paddingTop: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>办公用品</span>
            <span>¥12,580.00</span>
          </div>
        </div>
        <div style={{ position: "absolute", bottom: 16, right: 16, fontSize: 36, opacity: 0.3 }}>
          印
        </div>

        {/* OCR 扫描线 */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: `${agentColor}`,
            boxShadow: `0 0 16px ${agentColor}`,
            transform: `translateY(${ocrProgress * 100}%)`,
          }}
        />
      </div>

      {/* 右侧：识别结果 */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontSize: 20, color: agentColor, fontWeight: 700 }}>
          📊 OCR 识别结果
        </div>
        {fields.map((f, i) => (
          <div
            key={i}
            style={{
              opacity: f.revealed ? 1 : 0.3,
              transform: `translateX(${f.revealed ? 0 : 20}px)`,
              transition: "all 0.3s",
            }}
          >
            <div style={{ fontSize: 16, color: THEME.textMuted, marginBottom: 4 }}>
              {f.label}
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: f.highlight ? "#FBBF24" : f.success ? "#10B981" : THEME.text,
              }}
            >
              {f.revealed ? f.value : "······"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * 客服 Agent - 聊天对话 Mock
 */
export const MockChat: React.FC<MockProps> = ({ startFrame, agentColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = Math.max(0, frame - startFrame);

  const enter = spring({ frame: local, fps, config: { damping: 14 } });

  const messages = [
    { from: "user", text: "你好，我想咨询一下退款流程", time: "10:23" },
    { from: "ai", text: "您好！我是 AI 客服小服。请问您的订单号是？", time: "10:23" },
    { from: "user", text: "#20240815-X-056", time: "10:24" },
    { from: "ai", text: "已为您查到订单，金额 ¥580。退款将在 1-3 个工作日到账。", time: "10:24" },
  ];

  return (
    <div
      style={{
        background: "rgba(15, 23, 42, 0.85)",
        border: `1px solid ${agentColor}40`,
        borderRadius: 20,
        padding: 24,
        width: 720,
        height: 360,
        opacity: enter,
        transform: `translateY(${interpolate(enter, [0, 1], [30, 0])}px)`,
        backdropFilter: "blur(20px)",
        boxShadow: `0 20px 60px rgba(0,0,0,0.4), 0 0 40px ${agentColor}30`,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* 顶部 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          paddingBottom: 12,
          borderBottom: `1px solid rgba(255,255,255,0.1)`,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: agentColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
          }}
        >
          💬
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, color: THEME.text, fontWeight: 700 }}>AI 客服 · 小服</div>
          <div style={{ fontSize: 14, color: "#10B981" }}>● 在线 · 7×24h</div>
        </div>
      </div>

      {/* 消息列表 */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, overflow: "hidden" }}>
        {messages.map((m, i) => {
          const msgEnter = spring({ frame: local - 5 - i * 8, fps, config: { damping: 14 } });
          const isUser = m.from === "user";
          return (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: isUser ? "flex-end" : "flex-start",
                opacity: msgEnter,
                transform: `translateY(${interpolate(msgEnter, [0, 1], [20, 0])}px)`,
              }}
            >
              <div
                style={{
                  maxWidth: "75%",
                  background: isUser ? agentColor : "rgba(255,255,255,0.08)",
                  color: isUser ? "#FFFFFF" : THEME.text,
                  padding: "10px 16px",
                  borderRadius: 16,
                  fontSize: 18,
                  lineHeight: 1.4,
                }}
              >
                {m.text}
              </div>
            </div>
          );
        })}
      </div>

      {/* 输入框 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 16px",
          background: "rgba(255,255,255,0.06)",
          borderRadius: 24,
          border: `1px solid ${agentColor}60`,
        }}
      >
        <span style={{ fontSize: 18, color: THEME.textMuted }}>请输入问题...</span>
        <div
          style={{
            marginLeft: "auto",
            background: agentColor,
            padding: "4px 12px",
            borderRadius: 16,
            color: "#FFFFFF",
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          发送
        </div>
      </div>
    </div>
  );
};

/**
 * 法务 Agent - 合同审查 Mock
 */
export const MockContract: React.FC<MockProps> = ({ startFrame, agentColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = Math.max(0, frame - startFrame);

  const enter = spring({ frame: local, fps, config: { damping: 14 } });
  const reviewProgress = interpolate(local, [10, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const risks = [
    { y: 0.25, text: "违约金比例过高（30%）", level: "high" },
    { y: 0.55, text: "知识产权归属不明确", level: "medium" },
    { y: 0.78, text: "争议解决条款建议补充", level: "low" },
  ];

  return (
    <div
      style={{
        background: "rgba(15, 23, 42, 0.85)",
        border: `1px solid ${agentColor}40`,
        borderRadius: 20,
        padding: 24,
        width: 720,
        height: 360,
        opacity: enter,
        transform: `translateY(${interpolate(enter, [0, 1], [30, 0])}px)`,
        backdropFilter: "blur(20px)",
        boxShadow: `0 20px 60px rgba(0,0,0,0.4), 0 0 40px ${agentColor}30`,
        display: "flex",
        gap: 20,
      }}
    >
      {/* 左侧：合同文本 */}
      <div
        style={{
          flex: 1,
          background: "#FFFFFF",
          borderRadius: 12,
          padding: 16,
          color: "#1F2937",
          fontFamily: "serif",
          fontSize: 13,
          lineHeight: 1.6,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 900, textAlign: "center", marginBottom: 10 }}>
          服务采购合同
        </div>
        <div>甲方：XX 有限公司</div>
        <div>乙方：YY 科技公司</div>
        <div style={{ marginTop: 10 }}>
          一、合同金额：人民币 <span style={{ background: reviewProgress > 0.3 ? "#FEE2E2" : "transparent" }}>12,580.00 元</span>
        </div>
        <div>
          二、违约金：<span style={{ background: reviewProgress > 0.5 ? "#FEE2E2" : "transparent" }}>合同总金额的 30%</span>
        </div>
        <div>
          三、知识产权：<span style={{ background: reviewProgress > 0.7 ? "#FEF3C7" : "transparent" }}>双方共有</span>
        </div>
        <div>
          四、争议解决：<span style={{ background: reviewProgress > 0.85 ? "#DBEAFE" : "transparent" }}>······</span>
        </div>

        {/* 扫描进度条 */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            background: "rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              width: `${reviewProgress * 100}%`,
              height: "100%",
              background: agentColor,
              transition: "width 0.3s",
            }}
          />
        </div>
      </div>

      {/* 右侧：风险提示 */}
      <div style={{ width: 280, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 20, color: agentColor, fontWeight: 700, marginBottom: 6 }}>
          ⚖️ 风险审查
        </div>
        {risks.map((r, i) => {
          const show = reviewProgress > r.y + 0.1;
          const colors: Record<string, string> = {
            high: "#EF4444",
            medium: "#F59E0B",
            low: "#3B82F6",
          };
          return (
            <div
              key={i}
              style={{
                background: show ? `${colors[r.level]}20` : "rgba(255,255,255,0.04)",
                borderLeft: `4px solid ${colors[r.level]}`,
                borderRadius: 8,
                padding: "8px 12px",
                fontSize: 16,
                color: show ? THEME.text : "rgba(255,255,255,0.2)",
                opacity: show ? 1 : 0.3,
                transform: `translateX(${show ? 0 : 20}px)`,
                transition: "all 0.3s",
              }}
            >
              <div style={{ fontSize: 12, color: colors[r.level], fontWeight: 700, marginBottom: 2 }}>
                {r.level === "high" ? "🔴 高风险" : r.level === "medium" ? "🟡 中风险" : "🔵 低风险"}
              </div>
              {r.text}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * 行政 Agent - 日程日历 Mock
 */
export const MockCalendar: React.FC<MockProps> = ({ startFrame, agentColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = Math.max(0, frame - startFrame);

  const enter = spring({ frame: local, fps, config: { damping: 14 } });

  const events = [
    { time: "09:00", title: "晨会", icon: "☀️" },
    { time: "10:30", title: "客户对接", icon: "🤝" },
    { time: "14:00", title: "产品评审", icon: "📋" },
    { time: "16:00", title: "周报撰写", icon: "✍️" },
  ];

  return (
    <div
      style={{
        background: "rgba(15, 23, 42, 0.85)",
        border: `1px solid ${agentColor}40`,
        borderRadius: 20,
        padding: 24,
        width: 720,
        height: 360,
        opacity: enter,
        transform: `translateY(${interpolate(enter, [0, 1], [30, 0])}px)`,
        backdropFilter: "blur(20px)",
        boxShadow: `0 20px 60px rgba(0,0,0,0.4), 0 0 40px ${agentColor}30`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: agentColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
          }}
        >
          📅
        </div>
        <div>
          <div style={{ fontSize: 22, color: THEME.text, fontWeight: 700 }}>
            2024-08-15 周四
          </div>
          <div style={{ fontSize: 14, color: THEME.textMuted }}>AI 自动安排 · 智能推荐</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {events.map((e, i) => {
          const eventEnter = spring({ frame: local - 5 - i * 7, fps, config: { damping: 14 } });
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                background: "rgba(255,255,255,0.06)",
                borderLeft: `4px solid ${agentColor}`,
                borderRadius: 10,
                padding: "12px 16px",
                opacity: eventEnter,
                transform: `translateX(${interpolate(eventEnter, [0, 1], [30, 0])}px)`,
              }}
            >
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: agentColor,
                  minWidth: 80,
                  fontFamily: "monospace",
                }}
              >
                {e.time}
              </div>
              <div style={{ fontSize: 22 }}>{e.icon}</div>
              <div style={{ fontSize: 20, color: THEME.text, fontWeight: 600 }}>{e.title}</div>
              <div
                style={{
                  marginLeft: "auto",
                  fontSize: 12,
                  color: "#10B981",
                  padding: "4px 10px",
                  background: "rgba(16,185,129,0.15)",
                  borderRadius: 12,
                }}
              >
                AI 已优化
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};